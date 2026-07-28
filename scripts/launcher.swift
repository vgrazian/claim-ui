import Cocoa

let projectDir = "/Users/valer/claim-ui"
let nodePath   = "/opt/homebrew/bin/node"
let port       = 3001
let url        = "http://localhost:\(port)"
let healthURL  = "\(url)/api/health"

// ── helpers ──────────────────────────────────────────────────────────────────

func serverIsRunning() -> Bool {
    let task = Process()
    task.launchPath = "/usr/sbin/lsof"
    task.arguments = ["-ti:\(port)"]
    let pipe = Pipe()
    task.standardOutput = pipe
    task.launch()
    task.waitUntilExit()
    return !pipe.fileHandleForReading.readDataToEndOfFile().isEmpty
}

/// Returns true when the API health endpoint responds with 200
func serverIsReady() -> Bool {
    guard let url = URL(string: healthURL) else { return false }
    let semaphore = DispatchSemaphore(value: 0)
    var ready = false
    let task = URLSession.shared.dataTask(with: url) { _, response, _ in
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
            ready = true
        }
        semaphore.signal()
    }
    task.resume()
    _ = semaphore.wait(timeout: .now() + 2)
    return ready
}

func openBrowser() {
    NSWorkspace.shared.open(URL(string: url)!)
}

func waitForServer(timeout: Int = 30) -> Bool {
    for _ in 0..<timeout {
        if serverIsReady() { return true }
        Thread.sleep(forTimeInterval: 1)
    }
    return false
}

// ── App Delegate ─────────────────────────────────────────────────────────────

class AppDelegate: NSObject, NSApplicationDelegate {
    var serverProcess: Process?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Already running → just re-open browser and quit this instance
        if serverIsReady() {
            openBrowser()
            NSApp.terminate(nil)
            return
        }

        // Kill stale processes on our port
        let killTask = Process()
        killTask.launchPath = "/usr/bin/env"
        killTask.arguments = ["bash", "-c", "lsof -ti:\(port) | xargs kill -9 2>/dev/null; true"]
        killTask.launch()
        killTask.waitUntilExit()
        Thread.sleep(forTimeInterval: 0.5)

        // Start the Express server
        serverProcess = Process()
        serverProcess?.launchPath = nodePath
        serverProcess?.arguments = ["server/index.mjs"]
        serverProcess?.currentDirectoryPath = projectDir
        serverProcess?.launch()

        // Wait for server to be ready
        if waitForServer() {
            openBrowser()
        }

        // Mark app as active — stops the Dock bounce immediately
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }

    // Dock icon clicked while already running → re-open browser
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        openBrowser()
        return true
    }

    // Quit from Dock / ⌘Q → kill server
    func applicationWillTerminate(_ notification: Notification) {
        serverProcess?.terminate()
        serverProcess?.waitUntilExit()
    }
}

// ── Entry Point ──────────────────────────────────────────────────────────────

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
