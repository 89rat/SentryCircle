# SentryCircle: Auto-Start Guide

This guide explains how to configure SentryCircle to run automatically when your computer starts.

## Table of Contents

1. [Auto-Start Options](#auto-start-options)
2. [Setting Up Auto-Start](#setting-up-auto-start)
3. [Removing Auto-Start](#removing-auto-start)
4. [Troubleshooting](#troubleshooting)
5. [Advanced Configuration](#advanced-configuration)

## Auto-Start Options

SentryCircle provides three methods for automatically starting the application when your computer boots:

### 1. Startup Folder Shortcut (Recommended)

This method creates a shortcut in your Windows Startup folder, which runs when you log in. This is the simplest and most reliable method for most users.

**Advantages:**
- Easy to set up and remove
- Visible in the Startup folder
- Only runs when the current user logs in

**Disadvantages:**
- Only works after user login (not at system startup)
- May be disabled by some system optimization tools

### 2. Windows Task Scheduler

This method creates a scheduled task that runs when you log in. This provides more control over how the application starts.

**Advantages:**
- More configurable (can run with elevated privileges)
- Can be set to run even if the user doesn't log in
- Less likely to be disabled by optimization tools

**Disadvantages:**
- More complex to set up
- Requires administrative privileges

### 3. Windows Registry

This method adds an entry to the Windows Registry to run the application at startup.

**Advantages:**
- Works across user accounts if added to the system registry
- Very reliable method

**Disadvantages:**
- Less visible to users
- Requires administrative privileges to set up
- May be flagged by security software

## Setting Up Auto-Start

### Using the Setup Script

The easiest way to configure auto-start is to use the provided setup script:

1. Navigate to your SentryCircle installation directory
2. Run `setup_autostart.bat`
3. Choose your preferred auto-start method (option 1, 2, or 3)
4. Follow any additional prompts

### Manual Setup

#### Method 1: Startup Folder Shortcut

1. Press `Win + R` to open the Run dialog
2. Type `shell:startup` and press Enter
3. Right-click in the folder and select "New > Shortcut"
4. Browse to your SentryCircle installation directory and select `startup.bat`
5. Click "Next" and name the shortcut "SentryCircle"
6. Click "Finish"

#### Method 2: Task Scheduler

1. Press `Win + R` to open the Run dialog
2. Type `taskschd.msc` and press Enter
3. Click "Create Basic Task" in the right panel
4. Name it "SentryCircle" and click "Next"
5. Select "When I log on" and click "Next"
6. Select "Start a program" and click "Next"
7. Browse to your SentryCircle installation directory and select `startup.bat`
8. Click "Next" and then "Finish"

#### Method 3: Registry

1. Press `Win + R` to open the Run dialog
2. Type `regedit` and press Enter
3. Navigate to `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
4. Right-click in the right panel and select "New > String Value"
5. Name it "SentryCircle"
6. Double-click it and set the value to the full path of your `startup.bat` file (e.g., `C:\SentryCircle\startup.bat`)

## Removing Auto-Start

### Using the Setup Script

1. Navigate to your SentryCircle installation directory
2. Run `setup_autostart.bat`
3. Choose option 4 (Remove auto-start configuration)

### Manual Removal

#### Method 1: Startup Folder Shortcut

1. Press `Win + R` to open the Run dialog
2. Type `shell:startup` and press Enter
3. Find and delete the "SentryCircle" shortcut

#### Method 2: Task Scheduler

1. Press `Win + R` to open the Run dialog
2. Type `taskschd.msc` and press Enter
3. Find "SentryCircle" in the task list
4. Right-click it and select "Delete"

#### Method 3: Registry

1. Press `Win + R` to open the Run dialog
2. Type `regedit` and press Enter
3. Navigate to `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
4. Find and delete the "SentryCircle" entry

## Troubleshooting

### Application Doesn't Start Automatically

1. **Check if the startup script exists**: Ensure `startup.bat` is in your SentryCircle installation directory
2. **Check for error logs**: Look in the `logs` directory for any error messages
3. **Try running the script manually**: Double-click `startup.bat` to see if it runs correctly
4. **Check your auto-start configuration**: Run `setup_autostart.bat` and choose option 4 to remove the current configuration, then set it up again

### Application Starts But Services Don't Run

1. **Check if Node.js is installed**: The startup script requires Node.js to be installed
2. **Check if the required directories exist**: The script expects `cloudflare-worker` and `web-dashboard` directories
3. **Check if the configuration files exist**: The script checks for `cloudflare-worker\wrangler.toml.configured`
4. **Check the log files**: Look in the `logs` directory for specific error messages

## Advanced Configuration

### Modifying Startup Behavior

You can customize the startup behavior by editing `startup.bat`:

- To change the ports used by the services, modify the port numbers in the script
- To disable automatic browser opening, remove or comment out the line that starts with `start http://localhost:3000`
- To add additional services, add new start commands following the existing pattern

### Running in Minimized Mode

To run SentryCircle in minimized mode at startup:

1. If using the Startup Folder method, edit the shortcut properties and set "Run" to "Minimized"
2. If using Task Scheduler, edit the task and set "Run whether user is logged on or not" and check "Run with highest privileges"
3. If using Registry, you can't directly control the window state; use Task Scheduler instead

### Running Without Console Windows

To run SentryCircle without showing console windows:

1. Create a VBScript wrapper:
   ```vbs
   Set WshShell = CreateObject("WScript.Shell")
   WshShell.Run """C:\Path\To\SentryCircle\startup.bat""", 0, False
   ```

2. Use this VBScript file instead of `startup.bat` in your auto-start configuration
