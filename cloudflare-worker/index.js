/**
 * SentryCircle API - Cloudflare Worker Implementation
 * 
 * This worker provides the core backend functionality for SentryCircle,
 * including location tracking, command processing, and authentication.
 * 
 * It's designed to run entirely on Cloudflare's free tier.
 */

// KV Namespace bindings will be added in the Cloudflare dashboard:
// - SENTRYCIRCLE_KV: For storing user data, locations, and commands
// - SENTRYCIRCLE_AUTH: For storing authentication tokens

// Environment variables:
// - JWT_SECRET: Secret for signing JWT tokens

// Helper function to generate JWT tokens
const generateJWT = (payload, expiresIn = '7d') => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresIn === '7d' ? 7 * 24 * 60 * 60 : parseInt(expiresIn));
  
  const tokenPayload = {
    ...payload,
    iat: now,
    exp
  };
  
  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(tokenPayload));
  
  const signature = crypto.subtle.sign(
    'HMAC',
    JWT_SECRET,
    new TextEncoder().encode(`${base64Header}.${base64Payload}`)
  );
  
  return `${base64Header}.${base64Payload}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
};

// Helper function to verify JWT tokens
const verifyJWT = async (token) => {
  try {
    const [base64Header, base64Payload, signature] = token.split('.');
    
    const payload = JSON.parse(atob(base64Payload));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp <= now) {
      return { valid: false, reason: 'Token expired' };
    }
    
    const validSignature = await crypto.subtle.verify(
      'HMAC',
      JWT_SECRET,
      new Uint8Array(atob(signature).split('').map(c => c.charCodeAt(0))),
      new TextEncoder().encode(`${base64Header}.${base64Payload}`)
    );
    
    if (!validSignature) {
      return { valid: false, reason: 'Invalid signature' };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, reason: 'Invalid token format' };
  }
};

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Main request handler
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Route requests based on path
  if (url.pathname.startsWith('/api/auth')) {
    return handleAuth(request);
  } else if (url.pathname.startsWith('/api/location')) {
    return handleLocation(request);
  } else if (url.pathname.startsWith('/api/command')) {
    return handleCommand(request);
  } else if (url.pathname.startsWith('/api/family')) {
    return handleFamily(request);
  } else if (url.pathname.startsWith('/api/child')) {
    return handleChild(request);
  } else if (url.pathname.startsWith('/api/device')) {
    return handleDevice(request);
  } else if (url.pathname === '/api/health') {
    return new Response(JSON.stringify({ status: 'ok' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  
  return new Response('Not found', { status: 404, headers: corsHeaders });
}

// Authentication handler
async function handleAuth(request) {
  const url = new URL(request.url);
  
  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    return handleRegister(request);
  } else if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    return handleLogin(request);
  } else if (url.pathname === '/api/auth/verify' && request.method === 'POST') {
    return handleVerify(request);
  } else if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
    return handleRefresh(request);
  }
  
  return new Response('Not found', { status: 404, headers: corsHeaders });
}

// User registration handler
async function handleRegister(request) {
  try {
    const { email, password, name, role } = await request.json();
    
    // Validate input
    if (!email || !password || !name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Check if user already exists
    const existingUser = await SENTRYCIRCLE_KV.get(`user:${email}`);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User already exists' }), { 
        status: 409, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Hash the password (in a real implementation, use a proper password hashing algorithm)
    const passwordHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(password)
    );
    const hashedPassword = Array.from(new Uint8Array(passwordHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Generate a user ID
    const userId = crypto.randomUUID();
    
    // Create the user object
    const user = {
      id: userId,
      email,
      name,
      role,
      passwordHash: hashedPassword,
      createdAt: Date.now()
    };
    
    // Store the user in KV
    await SENTRYCIRCLE_KV.put(`user:${email}`, JSON.stringify(user));
    await SENTRYCIRCLE_KV.put(`userId:${userId}`, email);
    
    // Generate a JWT token
    const token = generateJWT({ userId, email, role });
    
    // Return the user and token (excluding the password hash)
    const { passwordHash: _, ...userWithoutPassword } = user;
    return new Response(JSON.stringify({ user: userWithoutPassword, token }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// User login handler
async function handleLogin(request) {
  try {
    const { email, password } = await request.json();
    
    // Validate input
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Get the user from KV
    const userJson = await SENTRYCIRCLE_KV.get(`user:${email}`);
    if (!userJson) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const user = JSON.parse(userJson);
    
    // Hash the provided password and compare
    const passwordHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(password)
    );
    const hashedPassword = Array.from(new Uint8Array(passwordHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (user.passwordHash !== hashedPassword) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Generate a JWT token
    const token = generateJWT({ userId: user.id, email, role: user.role });
    
    // Return the user and token (excluding the password hash)
    const { passwordHash: _, ...userWithoutPassword } = user;
    return new Response(JSON.stringify({ user: userWithoutPassword, token }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Token verification handler
async function handleVerify(request) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const result = await verifyJWT(token);
    
    if (!result.valid) {
      return new Response(JSON.stringify({ error: result.reason }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    return new Response(JSON.stringify({ valid: true, payload: result.payload }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Token refresh handler
async function handleRefresh(request) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const result = await verifyJWT(token);
    
    if (!result.valid) {
      return new Response(JSON.stringify({ error: result.reason }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Generate a new token
    const newToken = generateJWT({ 
      userId: result.payload.userId, 
      email: result.payload.email, 
      role: result.payload.role 
    });
    
    return new Response(JSON.stringify({ token: newToken }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Location handler
async function handleLocation(request) {
  // Authenticate the request
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  
  const token = authHeader.split(' ')[1];
  const authResult = await verifyJWT(token);
  
  if (!authResult.valid) {
    return new Response(JSON.stringify({ error: authResult.reason }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Handle location update
  if (request.method === 'POST' && pathParts.length === 2) {
    return handleLocationUpdate(request, authResult.payload);
  }
  
  // Handle location retrieval
  if (request.method === 'GET' && pathParts.length === 3) {
    const deviceId = pathParts[2];
    return handleLocationRetrieval(request, deviceId, authResult.payload);
  }
  
  return new Response('Not found', { status: 404, headers: corsHeaders });
}

// Location update handler
async function handleLocationUpdate(request, auth) {
  try {
    const { deviceId, location, timestamp, batteryLevel } = await request.json();
    
    // Validate input
    if (!deviceId || !location) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Verify device ownership
    const deviceJson = await SENTRYCIRCLE_KV.get(`device:${deviceId}`);
    if (!deviceJson) {
      return new Response(JSON.stringify({ error: 'Device not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const device = JSON.parse(deviceJson);
    
    // Only allow updates from the device owner or a guardian of the child
    if (device.userId !== auth.userId) {
      // Check if the user is a guardian of the child
      const childJson = await SENTRYCIRCLE_KV.get(`child:${device.childId}`);
      if (!childJson) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const child = JSON.parse(childJson);
      const familyJson = await SENTRYCIRCLE_KV.get(`family:${child.familyId}`);
      
      if (!familyJson) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const family = JSON.parse(familyJson);
      
      if (!family.guardians.includes(auth.userId)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }
    
    // Store the location update
    const locationData = {
      deviceId,
      location,
      timestamp: timestamp || Date.now(),
      batteryLevel: batteryLevel || 100
    };
    
    // Store the current location
    await SENTRYCIRCLE_KV.put(`currentLocation:${deviceId}`, JSON.stringify(locationData));
    
    // Add to location history
    const historyKey = `locationHistory:${deviceId}`;
    let history = [];
    
    try {
      const existingHistory = await SENTRYCIRCLE_KV.get(historyKey, 'json');
      if (existingHistory) {
        history = existingHistory;
      }
    } catch (e) {
      // No existing history
    }
    
    history.unshift(locationData);
    
    // Keep only the last 100 locations
    if (history.length > 100) {
      history = history.slice(0, 100);
    }
    
    await SENTRYCIRCLE_KV.put(historyKey, JSON.stringify(history));
    
    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Location retrieval handler
async function handleLocationRetrieval(request, deviceId, auth) {
  try {
    // Verify device access
    const deviceJson = await SENTRYCIRCLE_KV.get(`device:${deviceId}`);
    if (!deviceJson) {
      return new Response(JSON.stringify({ error: 'Device not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const device = JSON.parse(deviceJson);
    
    // Only allow retrieval by the device owner or a guardian of the child
    if (device.userId !== auth.userId) {
      // Check if the user is a guardian of the child
      const childJson = await SENTRYCIRCLE_KV.get(`child:${device.childId}`);
      if (!childJson) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const child = JSON.parse(childJson);
      const familyJson = await SENTRYCIRCLE_KV.get(`family:${child.familyId}`);
      
      if (!familyJson) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const family = JSON.parse(familyJson);
      
      if (!family.guardians.includes(auth.userId)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }
    
    // Get the current location
    const currentLocationJson = await SENTRYCIRCLE_KV.get(`currentLocation:${deviceId}`);
    if (!currentLocationJson) {
      return new Response(JSON.stringify({ error: 'No location data available' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const currentLocation = JSON.parse(currentLocationJson);
    
    // Get location history if requested
    const url = new URL(request.url);
    const includeHistory = url.searchParams.get('history') === 'true';
    
    if (includeHistory) {
      const historyJson = await SENTRYCIRCLE_KV.get(`locationHistory:${deviceId}`);
      const history = historyJson ? JSON.parse(historyJson) : [];
      
      return new Response(JSON.stringify({ 
        current: currentLocation,
        history
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    return new Response(JSON.stringify(currentLocation), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Command handler
async function handleCommand(request) {
  // Authenticate the request
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  
  const token = authHeader.split(' ')[1];
  const authResult = await verifyJWT(token);
  
  if (!authResult.valid) {
    return new Response(JSON.stringify({ error: authResult.reason }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Handle command creation
  if (request.method === 'POST' && pathParts.length === 2) {
    return handleCommandCreation(request, authResult.payload);
  }
  
  // Handle command retrieval
  if (request.method === 'GET' && pathParts.length === 3) {
    const deviceId = pathParts[2];
    return handleCommandRetrieval(request, deviceId, authResult.payload);
  }
  
  // Handle command update
  if (request.method === 'PUT' && pathParts.length === 4) {
    const deviceId = pathParts[2];
    const commandId = pathParts[3];
    return handleCommandUpdate(request, deviceId, commandId, authResult.payload);
  }
  
  return new Response('Not found', { status: 404, headers: corsHeaders });
}

// Command creation handler
async function handleCommandCreation(request, auth) {
  try {
    const { deviceId, type, data } = await request.json();
    
    // Validate input
    if (!deviceId || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Verify device access
    const deviceJson = await SENTRYCIRCLE_KV.get(`device:${deviceId}`);
    if (!deviceJson) {
      return new Response(JSON.stringify({ error: 'Device not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const device = JSON.parse(deviceJson);
    
    // Only allow commands from a guardian of the child
    const childJson = await SENTRYCIRCLE_KV.get(`child:${device.childId}`);
    if (!childJson) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const child = JSON.parse(childJson);
    const familyJson = await SENTRYCIRCLE_KV.get(`family:${child.familyId}`);
    
    if (!familyJson) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const family = JSON.parse(familyJson);
    
    if (!family.guardians.includes(auth.userId)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Create the command
    const commandId = crypto.randomUUID();
    const command = {
      id: commandId,
      deviceId,
      type,
      data: data || {},
      status: 'pending',
      createdAt: Date.now(),
      createdBy: auth.userId,
      updatedAt: Date.now()
    };
    
    // Store the command
    await SENTRYCIRCLE_KV.put(`command:${deviceId}:${commandId}`, JSON.stringify(command));
    
    // Add to the device's command list
    const commandsKey = `commands:${deviceId}`;
    let commands = [];
    
    try {
      const existingCommands = await SENTRYCIRCLE_KV.get(commandsKey, 'json');
      if (existingCommands) {
        commands = existingCommands;
      }
    } catch (e) {
      // No existing commands
    }
    
    commands.unshift(commandId);
    
    // Keep only the last 50 commands
    if (commands.length > 50) {
      commands = commands.slice(0, 50);
    }
    
    await SENTRYCIRCLE_KV.put(commandsKey, JSON.stringify(commands));
    
    return new Response(JSON.stringify({ 
      success: true,
      command
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Command retrieval handler
async function handleCommandRetrieval(request, deviceId, auth) {
  try {
    // Verify device access
    const deviceJson = await SENTRYCIRCLE_KV.get(`device:${deviceId}`);
    if (!deviceJson) {
      return new Response(JSON.stringify({ error: 'Device not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const device = JSON.parse(deviceJson);
    
    // Allow access by the device owner or a guardian of the child
    let hasAccess = device.userId === auth.userId;
    
    if (!hasAccess) {
      // Check if the user is a guardian of the child
      const childJson = await SENTRYCIRCLE_KV.get(`child:${device.childId}`);
      if (childJson) {
        const child = JSON.parse(childJson);
        const familyJson = await SENTRYCIRCLE_KV.get(`family:${child.familyId}`);
        
        if (familyJson) {
          const family = JSON.parse(familyJson);
          hasAccess = family.guardians.includes(auth.userId);
        }
      }
    }
    
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Get the device's command list
    const commandsKey = `commands:${deviceId}`;
    let commandIds = [];
    
    try {
      const existingCommands = await SENTRYCIRCLE_KV.get(commandsKey, 'json');
      if (existingCommands) {
        commandIds = existingCommands;
      }
    } catch (e) {
      // No existing commands
    }
    
    // Get the status filter
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    
    // Get the commands
    const commands = [];
    
    for (const commandId of commandIds) {
      const commandJson = await SENTRYCIRCLE_KV.get(`command:${deviceId}:${commandId}`);
      if (commandJson) {
        const command = JSON.parse(commandJson);
        
        // Apply status filter if provided
        if (!statusFilter || command.status === statusFilter) {
          commands.push(command);
        }
      }
    }
    
    return new Response(JSON.stringify({ commands }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Command update handler
async function handleCommandUpdate(request, deviceId, commandId, auth) {
  try {
    // Get the command
    const commandJson = await SENTRYCIRCLE_KV.get(`command:${deviceId}:${commandId}`);
    if (!commandJson) {
      return new Response(JSON.stringify({ error: 'Command not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const command = JSON.parse(commandJson);
    
    // Verify device access
    const deviceJson = await SENTRYCIRCLE_KV.get(`device:${deviceId}`);
    if (!deviceJson) {
      return new Response(JSON.stringify({ error: 'Device not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const device = JSON.parse(deviceJson);
    
    // Allow updates by the device owner or a guardian of the child
    let hasAccess = device.userId === auth.userId;
    
    if (!hasAccess) {
      // Check if the user is a guardian of the child
      const childJson = await SENTRYCIRCLE_KV.get(`child:${device.childId}`);
      if (childJson) {
        const child = JSON.parse(childJson);
        const familyJson = await SENTRYCIRCLE_KV.get(`family:${child.familyId}`);
        
        if (familyJson) {
          const family = JSON.parse(familyJson);
          hasAccess = family.guardians.includes(auth.userId);
        }
      }
    }
    
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Update the command
    const { status, result } = await request.json();
    
    if (status) {
      command.status = status;
    }
    
    if (result) {
      command.result = result;
    }
    
    command.updatedAt = Date.now();
    
    // Store the updated command
    await SENTRYCIRCLE_KV.put(`command:${deviceId}:${commandId}`, JSON.stringify(command));
    
    return new Response(JSON.stringify({ 
      success: true,
      command
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Family handler
async function handleFamily(request) {
  // Authenticate the request
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  
  const token = authHeader.split(' ')[1];
  const authResult = await verifyJWT(token);
  
  if (!authResult.valid) {
    return new Response(JSON.stringify({ error: authResult.reason }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Handle family creation
  if (request.method === 'POST' && pathParts.length === 2) {
    return handleFamilyCreation(request, authResult.payload);
  }
  
  // Handle family retrieval
  if (request.method === 'GET' && pathParts.length === 3) {
    const familyId = pathParts[2];
    return handleFamilyRetrieval(request, familyId, authResult.payload);
  }
  
  // Handle family update
  if (request.method === 'PUT' && pathParts.length === 3) {
    const familyId = pathParts[2];
    return handleFamilyUpdate(request, familyId, authResult.payload);
  }
  
  return new Response('Not found', { status: 404, headers: corsHeaders });
}

// Family creation handler
async function handleFamilyCreation(request, auth) {
  try {
    const { name } = await request.json();
    
    // Validate input
    if (!name) {
      return new Response(JSON.stringify({ error: 'Family name is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Create the family
    const familyId = crypto.randomUUID();
    const family = {
      id: familyId,
      name,
      guardians: [auth.userId],
      children: [],
      createdAt: Date.now(),
      createdBy: auth.userId,
      updatedAt: Date.now()
    };
    
    // Store the family
    await SENTRYCIRCLE_KV.put(`family:${familyId}`, JSON.stringify(family));
    
    // Add to the user's family list
    const userFamiliesKey = `userFamilies:${auth.userId}`;
    let userFamilies = [];
    
    try {
      const existingFamilies = await SENTRYCIRCLE_KV.get(userFamiliesKey, 'json');
      if (existingFamilies) {
        userFamilies = existingFamilies;
      }
    } catch (e) {
      // No existing families
    }
    
    userFamilies.push(familyId);
    await SENTRYCIRCLE_KV.put(userFamiliesKey, JSON.stringify(userFamilies));
    
    return new Response(JSON.stringify({ 
      success: true,
      family
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Family retrieval handler
async function handleFamilyRetrieval(request, familyId, auth) {
  try {
    // Get the family
    const familyJson = await SENTRYCIRCLE_KV.get(`family:${familyId}`);
    if (!familyJson) {
      return new Response(JSON.stringify({ error: 'Family not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const family = JSON.parse(familyJson);
    
    // Verify access
    if (!family.guardians.includes(auth.userId)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Get children details if requested
    const url = new URL(request.url);
    const includeChildren = url.searchParams.get('children') === 'true';
    
    if (includeChildren) {
      const children = [];
      
      for (const childId of family.children) {
        const childJson = await SENTRYCIRCLE_KV.get(`child:${childId}`);
        if (childJson) {
          children.push(JSON.parse(childJson));
        }
      }
      
      return new Response(JSON.stringify({ 
        ...family,
        childrenDetails: children
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    return new Response(JSON.stringify(family), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Family update handler
async function handleFamilyUpdate(request, familyId, auth) {
  try {
    // Get the family
    const familyJson = await SENTRYCIRCLE_KV.get(`family:${familyId}`);
    if (!familyJson) {
      return new Response(JSON.stringify({ error: 'Family not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const family = JSON.parse(familyJson);
    
    // Verify access
    if (!family.guardians.includes(auth.userId)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Update the family
    const { name, guardians } = await request.json();
    
    if (name) {
      family.name = name;
    }
    
    if (guardians) {
      family.guardians = guardians;
      
      // Ensure the current user remains a guardian
      if (!family.guardians.includes(auth.userId)) {
        family.guardians.push(auth.userId);
      }
    }
    
    family.updatedAt = Date.now();
    
    // Store the updated family
    await SENTRYCIRCLE_KV.put(`family:${familyId}`, JSON.stringify(family));
    
    return new Response(JSON.stringify({ 
      success: true,
      family
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Child handler
async function handleChild(request) {
  // Authenticate the request
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  
  const token = authHeader.split(' ')[1];
  const authResult = await verifyJWT(token);
  
  if (!authResult.valid) {
    return new Response(JSON.stringify({ error: authResult.reason }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Handle child creation
  if (request.method === 'POST' && pathParts.length === 2) {
    return handleChildCreation(request, authResult.payload);
  }
  
  // Handle child retrieval
  if (request.method === 'GET' && pathParts.length === 3) {
    const childId = pathParts[2];
    return handleChildRetrieval(request, childId, authResult.payload);
  }
  
  // Handle child update
  if (request.method === 'PUT' && pathParts.length === 3) {
    const childId = pathParts[2];
    return handleChildUpdate(request, childId, authResult.payload);
  }
  
  return new Response('Not found', { status: 404, headers: corsHeaders });
}

// Child creation handler
async function handleChildCreation(request, auth) {
  try {
    const { name, familyId, userId } = await request.json();
    
    // Validate input
    if (!name || !familyId) {
      return new Response(JSON.stringify({ error: 'Name and family ID are required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Verify family access
    const familyJson = await SENTRYCIRCLE_KV.get(`family:${familyId}`);
    if (!familyJson) {
      return new Response(JSON.stringify({ error: 'Family not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const family = JSON.parse(familyJson);
    
    if (!family.guardians.includes(auth.userId)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Create the child
    const childId = crypto.randomUUID();
    const child = {
      id: childId,
      name,
      familyId,
      userId: userId || null, // Link to a user account if provided
      devices: [],
      createdAt: Date.now(),
      createdBy: auth.userId,
      updatedAt: Date.now()
    };
    
    // Store the child
    await SENTRYCIRCLE_KV.put(`child:${childId}`, JSON.stringify(child));
    
    // Add to the family's children list
    family.children.push(childId);
    await SENTRYCIRCLE_KV.put(`family:${familyId}`, JSON.stringify(family));
    
    return new Response(JSON.stringify({ 
      success: true,
      child
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Child retrieval handler
async function handleChildRetrieval(request, childId, auth) {
  try {
    // Get the child
    const childJson = await SENTRYCIRCLE_KV.get(`child:${childId}`);
    if (!childJson) {
      return new Response(JSON.stringify({ error: 'Child not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const child = JSON.parse(childJson);
    
    // Verify access
    const familyJson = await SENTRYCIRCLE_KV.get(`family:${child.familyId}`);
    if (!familyJson) {
      return new Response(JSON.stringify({ error: 'Family not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const family = JSON.parse(familyJson);
    
    if (!family.guardians.includes(auth.userId) && child.userId !== auth.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Get devices details if requested
    const url = new URL(request.url);
    const includeDevices = url.searchParams.get('devices') === 'true';
    
    if (includeDevices) {
      const devices = [];
      
      for (const deviceId of child.devices) {
        const deviceJson = await SENTRYCIRCLE_KV.get(`device:${deviceId}`);
        if (deviceJson) {
          devices.push(JSON.parse(deviceJson));
        }
      }
      
      return new Response(JSON.stringify({ 
        ...child,
        devicesDetails: devices
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    return new Response(JSON.stringify(child), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Child update handler
async function handleChildUpdate(request, childId, auth) {
  try {
    // Get the child
    const childJson = await SENTRYCIRCLE_KV.get(`child:${childId}`);
    if (!childJson) {
      return new Response(JSON.stringify({ error: 'Child not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const child = JSON.parse(childJson);
    
    // Verify access
    const familyJson = await SENTRYCIRCLE_KV.get(`family:${child.familyId}`);
    if (!familyJson) {
      return new Response(JSON.stringify({ error: 'Family not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const family = JSON.parse(familyJson);
    
    if (!family.guardians.includes(auth.userId)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Update the child
    const { name, userId } = await request.json();
    
    if (name) {
      child.name = name;
    }
    
    if (userId !== undefined) {
      child.userId = userId;
    }
    
    child.updatedAt = Date.now();
    
    // Store the updated child
    await SENTRYCIRCLE_KV.put(`child:${childId}`, JSON.stringify(child));
    
    return new Response(JSON.stringify({ 
      success: true,
      child
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Device handler
async function handleDevice(request) {
  // Authenticate the request
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  
  const token = authHeader.split(' ')[1];
  const authResult = await verifyJWT(token);
  
  if (!authResult.valid) {
    return new Response(JSON.stringify({ error: authResult.reason }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
  
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Handle device registration
  if (request.method === 'POST' && pathParts.length === 2) {
    return handleDeviceRegistration(request, authResult.payload);
  }
  
  // Handle device retrieval
  if (request.method === 'GET' && pathParts.length === 3) {
    const deviceId = pathParts[2];
    return handleDeviceRetrieval(request, deviceId, authResult.payload);
  }
  
  // Handle device update
  if (request.method === 'PUT' && pathParts.length === 3) {
    const deviceId = pathParts[2];
    return handleDeviceUpdate(request, deviceId, authResult.payload);
  }
  
  return new Response('Not found', { status: 404, headers: corsHeaders });
}

// Device registration handler
async function handleDeviceRegistration(request, auth) {
  try {
    const { name, type, childId } = await request.json();
    
    // Validate input
    if (!name || !type || !childId) {
      return new Response(JSON.stringify({ error: 'Name, type, and child ID are required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Verify child access
    const childJson = await SENTRYCIRCLE_KV.get(`child:${childId}`);
    if (!childJson) {
      return new Response(JSON.stringify({ error: 'Child not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const child = JSON.parse(childJson);
    
    // Verify family access
    const familyJson = await SENTRYCIRCLE_KV.get(`family:${child.familyId}`);
    if (!familyJson) {
      return new Response(JSON.stringify({ error: 'Family not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const family = JSON.parse(familyJson);
    
    // Allow device registration by a guardian or the child's user account
    if (!family.guardians.includes(auth.userId) && child.userId !== auth.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Create the device
    const deviceId = crypto.randomUUID();
    const device = {
      id: deviceId,
      name,
      type,
      childId,
      userId: auth.userId,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Store the device
    await SENTRYCIRCLE_KV.put(`device:${deviceId}`, JSON.stringify(device));
    
    // Add to the child's devices list
    child.devices.push(deviceId);
    await SENTRYCIRCLE_KV.put(`child:${childId}`, JSON.stringify(child));
    
    return new Response(JSON.stringify({ 
      success: true,
      device
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Device retrieval handler
async function handleDeviceRetrieval(request, deviceId, auth) {
  try {
    // Get the device
    const deviceJson = await SENTRYCIRCLE_KV.get(`device:${deviceId}`);
    if (!deviceJson) {
      return new Response(JSON.stringify({ error: 'Device not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const device = JSON.parse(deviceJson);
    
    // Verify access
    let hasAccess = device.userId === auth.userId;
    
    if (!hasAccess) {
      // Check if the user is a guardian of the child
      const childJson = await SENTRYCIRCLE_KV.get(`child:${device.childId}`);
      if (childJson) {
        const child = JSON.parse(childJson);
        const familyJson = await SENTRYCIRCLE_KV.get(`family:${child.familyId}`);
        
        if (familyJson) {
          const family = JSON.parse(familyJson);
          hasAccess = family.guardians.includes(auth.userId);
        }
      }
    }
    
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Get location if requested
    const url = new URL(request.url);
    const includeLocation = url.searchParams.get('location') === 'true';
    
    if (includeLocation) {
      const locationJson = await SENTRYCIRCLE_KV.get(`currentLocation:${deviceId}`);
      const location = locationJson ? JSON.parse(locationJson) : null;
      
      return new Response(JSON.stringify({ 
        ...device,
        location
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    return new Response(JSON.stringify(device), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Device update handler
async function handleDeviceUpdate(request, deviceId, auth) {
  try {
    // Get the device
    const deviceJson = await SENTRYCIRCLE_KV.get(`device:${deviceId}`);
    if (!deviceJson) {
      return new Response(JSON.stringify({ error: 'Device not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const device = JSON.parse(deviceJson);
    
    // Verify access
    let hasAccess = device.userId === auth.userId;
    
    if (!hasAccess) {
      // Check if the user is a guardian of the child
      const childJson = await SENTRYCIRCLE_KV.get(`child:${device.childId}`);
      if (childJson) {
        const child = JSON.parse(childJson);
        const familyJson = await SENTRYCIRCLE_KV.get(`family:${child.familyId}`);
        
        if (familyJson) {
          const family = JSON.parse(familyJson);
          hasAccess = family.guardians.includes(auth.userId);
        }
      }
    }
    
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Update the device
    const { name, status } = await request.json();
    
    if (name) {
      device.name = name;
    }
    
    if (status) {
      device.status = status;
    }
    
    device.updatedAt = Date.now();
    
    // Store the updated device
    await SENTRYCIRCLE_KV.put(`device:${deviceId}`, JSON.stringify(device));
    
    return new Response(JSON.stringify({ 
      success: true,
      device
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}
