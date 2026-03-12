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
    const playSound = (soundFile, soundId) => {
        if (!isEnabled)
            return;
        // Check if individual sound is enabled
        if (soundId) {
            const isSoundOn = vscode.workspace.getConfiguration('dev-voice.sounds').get(soundId, true);
            if (!isSoundOn)
                return;
        }
        const soundPath = path.join(context.extensionPath, 'resources', 'sounds', soundFile);
        player.play(soundPath, (err) => {
            if (err) {
                console.error(`Failed to play sound: ${soundFile}`, err);
            }
        });
    };
    // Welcome sound on activation
    playSound('hub-intro-sound.mp3', 'startup');
    // Save sound
    let saveDisposable = vscode.workspace.onDidSaveTextDocument(() => {
        const autoSaveConfig = vscode.workspace.getConfiguration('files').get('autoSave');
        if (autoSaveConfig === 'off') {
            playSound('accha-thik-hai-samjhgya-puneet-superstar.mp3');
        }
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
    // Workspace/Folder sounds
    let workspaceDisposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        playSound('rom-rom-bhaiyo.mp3');
    });
    let openDocDisposable = vscode.workspace.onDidOpenTextDocument(() => {
        // Debounce or filter might be needed if many docs open at once, 
        // but for now simple trigger
        playSound('rom-rom-bhaiyo.mp3');
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
        const query = await vscode.window.showInputBox({ prompt: 'Search workspace (Audible)' });
        if (query) {
            const results = await vscode.workspace.findFiles(`**/${query}*`, null, 1);
            if (results.length === 0) {
                playSound('_Tera baap chod gaya tha ki teri maa meme Welcome.mp3');
                vscode.window.showWarningMessage(`No results found for "${query}"`);
            }
            else {
                vscode.window.showInformationMessage(`Found ${results.length} result(s).`);
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
                    ['startup', 'searchFail', 'typing', 'save', 'delete', 'branchDirty', 'errorSingle', 'errorMedium', 'errorHigh', 'mergeConflict', 'mergeConflictHigh', 'closeError', 'closeDirty'].forEach(id => {
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
    context.subscriptions.push(saveDisposable, deleteFileDisposable, searchEditorDisposable, diagDisposable, workspaceDisposable, openDocDisposable, dashboardCommand, enableCommand, disableCommand, customSearchCommand);
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
    // On Mac, we use 'afplay'
    const playSync = (file) => {
        const soundPath = path.join(currentContext.extensionPath, 'resources', 'sounds', file);
        // Using 'afplay' on Mac to play sound quickly before exit
        try {
            (0, child_process_1.exec)(`afplay "${soundPath}"`);
        }
        catch (e) { }
    };
    if (totalErrors > 0) {
        playSync('gey-echo.mp3');
    }
    else if (hasUncommitted) {
        playSync('mka-ladle-meow-gop.mp3');
    }
}
//# sourceMappingURL=extension.js.map