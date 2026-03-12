"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const player = require('play-sound')({});
let isEnabled = true;
let currentRepo = null;
let currentContext = null;
function activate(context) {
    currentContext = context;
    console.log('Dev Voice is now active!');
    isEnabled = vscode.workspace.getConfiguration('dev-voice').get('enabled', true);
    let currentSoundProcess = null;
    const playSound = (soundFile, soundId) => {
        if (!isEnabled)
            return;
        // Ensure only one sound plays at a time
        if (currentSoundProcess) {
            try {
                // On some systems .kill() might need 'SIGKILL' for immediate stop
                currentSoundProcess.kill();
            }
            catch (e) { }
            currentSoundProcess = null;
        }
        // Check if individual sound is enabled
        if (soundId) {
            const isSoundOn = vscode.workspace.getConfiguration('dev-voice.sounds').get(soundId, true);
            if (!isSoundOn)
                return;
        }
        const soundPath = path.join(context.extensionPath, 'resources', 'sounds', soundFile);
        const volume = vscode.workspace.getConfiguration('dev-voice').get('volume', 1.0);
        // Platform-specific player and volume handling
        const platform = process.platform;
        let options = {};
        if (platform === 'darwin') {
            // Mac: afplay
            options = { afplay: ['-v', volume.toString()] };
        }
        else if (platform === 'linux') {
            // Linux: prioritize mpg123 or mplayer to avoid 'aplay' static noise with MP3s
            // mpg123 uses -f for volume (range often 0-32768, but 1.0 scale depends on version)
            // mplayer uses -volume
            options = { mplayer: ['-volume', (volume * 100).toString()] };
            // fallback for mpg123 if used by play-sound
            options.mpg123 = ['-f', Math.floor(volume * 32768).toString()];
        }
        else if (platform === 'win32') {
            // Windows usually uses cmdmp3 or wmplayer
            // cmdmp3 doesn't have easy volume flag in standard play-sound wrapper
        }
        try {
            currentSoundProcess = player.play(soundPath, options, (err) => {
                if (err && !currentSoundProcess) {
                    // Only log if it wasn't killed by us
                    console.error(`Playback error on ${platform}:`, err);
                }
                currentSoundProcess = null;
            });
        }
        catch (err) {
            console.error('Failed to initiate playback:', err);
        }
    };
    // Welcome sound on activation
    playSound('hub-intro-sound.mp3', 'startup');
    // Run sound (triggered when user clicks on Run/Debug)
    let runDisposable = vscode.debug.onDidStartDebugSession(() => {
        playSound('accha-thik-hai-samjhgya-puneet-superstar.mp3', 'run');
    });
    // File Deletion sound
    let deleteFileDisposable = vscode.workspace.onDidDeleteFiles((event) => {
        if (event.files.length > 0) {
            playSound('matlab-wo-alag-hi-level-ka-banda-tha.mp3');
        }
    });
    // Search Editor listener (for 'found nothing' in search)
    let searchEditorDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
        const document = event.document;
        if (document.languageId === 'search-result') {
            const text = document.getText();
            // Check for "0 results" in Search Editor
            if (text.includes('0 results in') || text.includes('No results found')) {
                playSound('_Tera baap chod gaya tha ki teri maa meme Welcome.mp3');
            }
        }
    });
    // Error Tracking Logic
    let lastErrorFileCount = 0;
    let lastTotalErrorCount = 0;
    const getErrorStats = () => {
        let fileWithErrorsCount = 0;
        let totalErrors = 0;
        const diagnostics = vscode.languages.getDiagnostics();
        for (const [uri, diagList] of diagnostics) {
            const errors = diagList.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            if (errors.length > 0) {
                fileWithErrorsCount++;
                totalErrors += errors.length;
            }
        }
        return { fileWithErrorsCount, totalErrors };
    };
    // Initialize stats
    const initialStats = getErrorStats();
    lastErrorFileCount = initialStats.fileWithErrorsCount;
    lastTotalErrorCount = initialStats.totalErrors;
    let diagDisposable = vscode.languages.onDidChangeDiagnostics(() => {
        const stats = getErrorStats();
        // If errors Increased
        if (stats.totalErrors > lastTotalErrorCount) {
            if (stats.fileWithErrorsCount === 1) {
                playSound('aayein-meme.mp3', 'errorSingle');
            }
            else if (stats.fileWithErrorsCount >= 2 && stats.fileWithErrorsCount <= 4) {
                playSound('cid-acp-mc.mp3', 'errorMedium');
            }
            else if (stats.fileWithErrorsCount > 4) {
                playSound('kya-cheda-bsd.mp3', 'errorHigh');
            }
        }
        // If multiple errors Fixed
        else if (stats.totalErrors < lastTotalErrorCount) {
            if (lastTotalErrorCount - stats.totalErrors >= 2) {
                playSound('tudum-tedev.mp3', 'fixedMultiple');
            }
        }
        lastErrorFileCount = stats.fileWithErrorsCount;
        lastTotalErrorCount = stats.totalErrors;
    });
    // Track which files have been edited in this session
    const editedFiles = new Set();
    // Workspace/Folder sounds
    let workspaceDisposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        playSound('rom-rom-bhaiyo.mp3');
    });
    // Sound for NEW file creation
    let createFilesDisposable = vscode.workspace.onDidCreateFiles(() => {
        playSound('rom-rom-bhaiyo.mp3', 'newFile');
    });
    // Sound for FIRST edition/edit in a file
    let firstEditDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        // Skip search results, output channels, and only handle file schemes
        if (!editedFiles.has(uri) &&
            event.document.uri.scheme === 'file' &&
            event.document.languageId !== 'search-result') {
            editedFiles.add(uri);
            playSound('rom-rom-bhaiyo.mp3', 'newFile');
        }
    });
    // Git Listener (Branch + Conflicts)
    let gitDisposable;
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (gitExtension) {
        const gitApi = gitExtension.exports.getAPI(1);
        if (gitApi && gitApi.repositories.length > 0) {
            const repo = gitApi.repositories[0];
            currentRepo = repo;
            let lastBranch = repo.state.HEAD?.name;
            let lastMergeConflictCount = repo.state.mergeChanges.length;
            gitDisposable = repo.state.onDidChange(() => {
                // Branch detection
                const currentBranch = repo.state.HEAD?.name;
                if (currentBranch !== lastBranch) {
                    const hasChanges = repo.state.workingTreeChanges.length > 0 || repo.state.indexChanges.length > 0;
                    if (hasChanges) {
                        playSound('vine-boom-sound-effect_KT89XIq.mp3');
                    }
                    lastBranch = currentBranch;
                }
                // Merge conflict detection
                const currentMergeConflictCount = repo.state.mergeChanges.length;
                if (currentMergeConflictCount > lastMergeConflictCount) {
                    if (currentMergeConflictCount > 2) {
                        playSound('teri-gand-mari.mp3');
                    }
                    else {
                        playSound('tehelka-omlette.mp3');
                    }
                }
                lastMergeConflictCount = currentMergeConflictCount;
            });
        }
    }
    // Terminal Execution Listeners
    let terminalDisposable = vscode.window.onDidEndTerminalShellExecution((event) => {
        const exitCode = event.exitCode;
        const commandLine = (event.execution.commandLine.value || '').toLowerCase();
        if (exitCode === 0) {
            // Success sound
            playSound('tudum-tedev.mp3', 'terminalSuccess');
        }
        else if (exitCode !== undefined && exitCode !== 0) {
            // Failure logic
            const devCommands = ['npm run', 'npm install', 'npm i ', 'flutter', 'python', 'node ', 'go run', 'rustc', 'cargo'];
            const isDevCommand = devCommands.some(cmd => commandLine.includes(cmd));
            if (isDevCommand) {
                // Important dev command failed
                playSound('kya-cheda-bsd.mp3', 'terminalDevFail');
            }
            else {
                // General command error
                playSound('mka-ladle-meow-gop.mp3', 'terminalFail');
            }
        }
    });
    // Commands
    let enableCommand = vscode.commands.registerCommand('dev-voice.enable', () => {
        isEnabled = true;
        vscode.workspace.getConfiguration('dev-voice').update('enabled', true, true);
        vscode.window.showInformationMessage('Dev Voice enabled!');
    });
    let disableCommand = vscode.commands.registerCommand('dev-voice.disable', () => {
        isEnabled = false;
        vscode.workspace.getConfiguration('dev-voice').update('enabled', false, true);
        vscode.window.showInformationMessage('Dev Voice disabled!');
    });
    // Custom search command to demonstrate the sound
    let customSearchCommand = vscode.commands.registerCommand('dev-voice.search', async () => {
        const query = await vscode.window.showInputBox({
            prompt: 'Search (Files or Text)',
            placeHolder: 'Enter file name or text pattern...'
        });
        if (query) {
            // First search for files
            const files = await vscode.workspace.findFiles(`**/${query}*`, null, 1);
            // If no files found, search for text in active editor
            let foundText = false;
            if (files.length === 0 && vscode.window.activeTextEditor) {
                const text = vscode.window.activeTextEditor.document.getText();
                if (text.includes(query)) {
                    foundText = true;
                    vscode.window.showInformationMessage(`Found "${query}" in current editor.`);
                }
            }
            if (files.length === 0 && !foundText) {
                playSound('_Tera baap chod gaya tha ki teri maa meme Welcome.mp3');
                vscode.window.showWarningMessage(`No results found for "${query}"`);
            }
            else if (files.length > 0) {
                vscode.window.showInformationMessage(`Found ${files.length} file(s).`);
            }
        }
    });
    // Dashboard Command
    let dashboardCommand = vscode.commands.registerCommand('dev-voice.dashboard', () => {
        const panel = vscode.window.createWebviewPanel('devVoiceDashboard', 'Dev Voice Dashboard', vscode.ViewColumn.One, { enableScripts: true });
        const htmlPath = path.join(context.extensionPath, 'resources', 'dashboard.html');
        require('fs').readFile(htmlPath, 'utf8', (err, data) => {
            if (err) {
                vscode.window.showErrorMessage('Could not load dashboard UI');
                return;
            }
            panel.webview.html = data;
        });
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'ready':
                    const config = vscode.workspace.getConfiguration('dev-voice.sounds');
                    const soundMap = {};
                    ['startup', 'searchFail', 'typing', 'save', 'run', 'newFile', 'delete', 'branchDirty', 'errorSingle', 'errorMedium', 'errorHigh', 'mergeConflict', 'mergeConflictHigh', 'terminalSuccess', 'terminalDevFail', 'terminalFail', 'closeError', 'closeDirty'].forEach(id => {
                        soundMap[id] = config.get(id, true);
                    });
                    panel.webview.postMessage({ command: 'updateConfig', config: soundMap });
                    break;
                case 'toggleSound':
                    vscode.workspace.getConfiguration('dev-voice.sounds').update(message.id, message.enabled, true);
                    break;
                case 'previewSound':
                    playSound(message.file);
                    break;
            }
        });
    });
    context.subscriptions.push(runDisposable, deleteFileDisposable, searchEditorDisposable, diagDisposable, workspaceDisposable, createFilesDisposable, firstEditDisposable, terminalDisposable, dashboardCommand, enableCommand, disableCommand, customSearchCommand);
    if (gitDisposable)
        context.subscriptions.push(gitDisposable);
}
function deactivate() {
    if (!isEnabled || !currentContext)
        return;
    // Check for errors
    let totalErrors = 0;
    const diagnostics = vscode.languages.getDiagnostics();
    for (const [uri, diagList] of diagnostics) {
        totalErrors += diagList.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
    }
    // Check for uncommitted changes
    let hasUncommitted = false;
    if (currentRepo) {
        hasUncommitted = currentRepo.state.workingTreeChanges.length > 0 || currentRepo.state.indexChanges.length > 0;
    }
    // Since we are deactivating, we use sync execution or spawn a detached process
    const playSync = (file) => {
        if (!currentContext)
            return;
        const soundPath = path.join(currentContext.extensionPath, 'resources', 'sounds', file);
        const platform = process.platform;
        try {
            if (platform === 'darwin') {
                (0, child_process_1.exec)(`afplay "${soundPath}"`);
            }
            else if (platform === 'win32') {
                // powershell command for windows
                (0, child_process_1.exec)(`powershell -c "(New-Object Media.SoundPlayer '${soundPath}').PlaySync()"`);
            }
            else if (platform === 'linux') {
                // Linux: try mpg123 or mplayer (detached/background)
                (0, child_process_1.exec)(`mpg123 "${soundPath}" || mplayer "${soundPath}"`);
            }
        }
        catch (e) {
            console.error('Failed to play exit sound', e);
        }
    };
    if (totalErrors > 0) {
        playSync('gey-echo.mp3');
    }
    else if (hasUncommitted) {
        playSync('mka-ladle-meow-gop.mp3');
    }
}
//# sourceMappingURL=extension.js.map