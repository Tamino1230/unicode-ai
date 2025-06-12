document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const fileUpload = document.getElementById('fileUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const projectUpload = document.getElementById('projectUpload');
    const folderNameDisplay = document.getElementById('folderNameDisplay');
    const projectFileStructureDiv = document.getElementById('projectFileStructure');
    const projectProcessingProgressDiv = document.getElementById('projectProcessingProgress');
    const projectProgressBar = document.getElementById('projectProgressBar');
    const cleanButton = document.getElementById('cleanButton');
    const highlightedOutput = document.getElementById('highlightedOutput');
    const cleanedOutput = document.getElementById('cleanedOutput');
    const statsOutput = document.getElementById('statsOutput');
    const downloadButton = document.getElementById('downloadButton');
    const downloadProjectButton = document.getElementById('downloadProjectButton');
    const tabs = document.querySelectorAll('.tab-button');
    const outputContents = document.querySelectorAll('.output-content-area');
    const modeTabs = document.querySelectorAll('.mode-tab-button');
    const normalModeInput = document.getElementById('normalModeInput');
    const projectModeInput = document.getElementById('projectModeInput');

    const toggleEditCharsSidebarButton = document.getElementById('toggleEditCharsSidebarButton');
    const editCharsSidebar = document.getElementById('editCharsSidebar');
    const unicodeCharsTextarea = document.getElementById('unicodeCharsTextarea');
    const saveCharsButton = document.getElementById('saveCharsButton');
    const resetCharsButton = document.getElementById('resetCharsButton');


    const highlightedOutputTabButton = document.querySelector('.tab-button[data-tab="highlightedOutput"]');
    const cleanedOutputTabButton = document.querySelector('.tab-button[data-tab="cleanedOutput"]');


    let originalFileName = 'cleaned_text.txt';
    let currentCleanedText = '';
    let currentMode = 'normal'; 
    let projectFilesData = []; 
    let cleanedProjectFiles = {}; 
    let lastProjectProcessingTime = '';

    const defaultUnicodeCharsToRemove = [
        '\u200b', '\u200c', '\u200d', '\uFEFF', '\u2060', '\u180E',
        '\u202A', '\u202B', '\u202C', '\u202D', '\u202E', '\u00AD',
        '\u034F', '\u061C', '\u115F', '\u1160', '\u17B4', '\u17B5',
        '\u180B', '\u180C', '\u180D', '\uFE00', '\uFE01', '\uFE02',
        '\uFE03', '\uFE04', '\uFE05', '\uFE06', '\uFE07', '\uFE08',
        '\uFE09', '\uFE0A', '\uFE0B', '\uFE0C', '\uFE0D', '\uFE0E',
        '\uFE0F', '\uFFF9', '\uFFFA', '\uFFFB', '\u202F'
    ];

    let currentUnicodeCharsToRemove = getDefaultParsedChars();

    function parseCharsString(charsString) {
        return charsString.split(/\r\n|\n|\r/)
            .map(line => line.trim())
            .filter(line => line)
            .flatMap(line => {
                if (line.includes('-') && line.startsWith('U+')) { 
                    const parts = line.split('-');
                    if (parts.length === 2) {
                        const startHex = parts[0].substring(2);
                        const endHex = parts[1].startsWith('U+') ? parts[1].substring(2) : parts[1];
                        const start = parseInt(startHex, 16);
                        const end = parseInt(endHex, 16);
                        if (!isNaN(start) && !isNaN(end) && start <= end) {
                            const rangeChars = [];
                            for (let i = start; i <= end; i++) {
                                rangeChars.push(String.fromCharCode(i));
                            }
                            return rangeChars;
                        }
                    }
                    console.warn(`Invalid range: ${line}`);
                    return [];
                } else if (line.startsWith('U+')) {
                     try {
                        return String.fromCharCode(parseInt(line.substring(2), 16));
                    } catch (e) {
                        console.warn(`Invalid U+ notation: ${line}`);
                        return [];
                    }
                } else {
                    try {
                        return JSON.parse('"' + line.replace(/"/g, '\\"') + '"');
                    } catch (e) {
                        return line;
                    }
                }
            });
    }

    function getDefaultParsedChars() {
        return defaultUnicodeCharsToRemove.map(str => {
            try {
                return JSON.parse(`"${str}"`);
            } catch (e) {
                console.warn(`Could not parse default unicode escape: ${str}`);
                return str;
            }
        });
    }

    function loadCharsFromStorage() {
        const storedChars = localStorage.getItem('unicodeCharsToRemove');
        if (storedChars) {
            unicodeCharsTextarea.value = storedChars;
            currentUnicodeCharsToRemove = parseCharsString(storedChars);
        } else {
            unicodeCharsTextarea.value = defaultUnicodeCharsToRemove.join('\n'); //* Use actual newline for display
            currentUnicodeCharsToRemove = getDefaultParsedChars();
        }
    }

    function saveCharsToStorage() {
        const charsString = unicodeCharsTextarea.value;
        localStorage.setItem('unicodeCharsToRemove', charsString);
        currentUnicodeCharsToRemove = parseCharsString(charsString);
        // alert('Character list saved!'); 
        // editCharsSidebar.classList.remove('open'); 
    }

    //* Sidebar Event Listeners
    if (toggleEditCharsSidebarButton && editCharsSidebar) { //* Removed closeEditCharsSidebarButton from condition
        toggleEditCharsSidebarButton.addEventListener('click', () => {
            editCharsSidebar.classList.toggle('open');
        });

        //* Removed close button event listener
    }

    if (saveCharsButton) {
        saveCharsButton.addEventListener('click', () => {
            saveCharsToStorage();
            alert('Character list saved!'); //* Keep alert for explicit save
            editCharsSidebar.classList.remove('open'); 
        });
    }

    if (resetCharsButton) {
        resetCharsButton.addEventListener('click', () => {
            // Schreibe nur die Unicode-Notation (U+....) als Text in das Textfeld
            const defaultLines = defaultUnicodeCharsToRemove.map(c => {
                const code = c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
                return `U+${code}`;
            });
            unicodeCharsTextarea.value = defaultLines.join('\n');
            currentUnicodeCharsToRemove = getDefaultParsedChars();
            saveCharsToStorage(); 
            alert('Character list reset to default and saved!');
            // editCharsSidebar.classList.remove('open'); // Keep sidebar open after reset for confirmation
        });
    }

    // *Load characters on initial load
    loadCharsFromStorage();


    fileUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            originalFileName = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                inputText.value = e.target.result;
            };
            reader.readAsText(file);
        } else {
            fileNameDisplay.textContent = 'No file chosen';
            originalFileName = 'cleaned_text.txt';
        }
    });

    projectUpload.addEventListener('change', (event) => {
        const files = Array.from(event.target.files);
        let rootFolderName = null;
        if (files.length > 0 && files[0].webkitRelativePath) {
            const allFirstSegments = files.map(f => {
                const relPath = f.webkitRelativePath;
                if (!relPath) return null;
                const firstSlash = relPath.indexOf('/');
                if (firstSlash > 0) return relPath.substring(0, firstSlash);
                return null;
            }).filter(Boolean);
            if (allFirstSegments.length > 0 && allFirstSegments.every(seg => seg === allFirstSegments[0])) {
                rootFolderName = allFirstSegments[0];
            }
        }
        let rootIsDotOrUnderscore = false;
        if (rootFolderName && (rootFolderName.startsWith('.') || rootFolderName.startsWith('__'))) {
            rootIsDotOrUnderscore = true;
        }
        let autoDeactivatedFolders = new Set();
        projectFilesData = files.map((file, index) => {
            const originalPath = file.webkitRelativePath || file.name;
            const parts = originalPath.split(/[\\\/]/);
            let skipType = false;
            if (rootIsDotOrUnderscore && parts.length > 1) {
                const subParts = parts.slice(1);
                if (subParts.some(part => part.startsWith('.') && part.length > 1)) skipType = 'dotfolder';
                else if (subParts.some(part => part.startsWith('__') && part.length > 2)) skipType = 'underscorefolder';
            } else {
                skipType = shouldSkipFile(originalPath, rootIsDotOrUnderscore);
            }
            let isSkipped = skipType === true;
            let isDotOrUnderscoreFolder = skipType === 'dotfolder' || skipType === 'underscorefolder';
            let autoDeactivatedFolder = null;
            if (isDotOrUnderscoreFolder) {
                const searchParts = (rootIsDotOrUnderscore && parts.length > 1) ? parts.slice(1) : parts;
                autoDeactivatedFolder = searchParts.find(part => (part.startsWith('.') && part.length > 1) || (part.startsWith('__') && part.length > 2));
                if (autoDeactivatedFolder) autoDeactivatedFolders.add(autoDeactivatedFolder);
            }
            
            const lowerPath = originalPath.toLowerCase();
            const binaryExts = [
                '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.exe', '.dll', '.so', '.dylib', '.bin', '.app', '.msi', '.deb', '.rpm',
                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.ico',
                '.mp3', '.wav', '.aac', '.ogg', '.flac',
                '.mp4', '.avi', '.mov', '.wmv', '.mkv', '.flv',
                '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                '.iso', '.img', '.dmg', 'otf', 'ttf', '.woff', '.woff2', '.eot', '.svg', '.cpy'
            ];
            let isBinary = binaryExts.some(ext => lowerPath.endsWith(ext));
            if (isBinary) {
                isSkipped = true;
                isDotOrUnderscoreFolder = false;
            }
            return {
                file: file,
                isActive: !(isSkipped || isDotOrUnderscoreFolder || isBinary),
                id: `project-file-${index}`,
                originalPath: originalPath,
                cleanedTextContent: null,
                isSkipped: isSkipped,
                details: isSkipped ? 'Skipped (binary/archive/media)' : (isDotOrUnderscoreFolder ? 'dotfolder' : ''),
                autoDeactivatedFolder: autoDeactivatedFolder
            };
        });

        if (projectFilesData.length > 0) {
            folderNameDisplay.textContent = `${projectFilesData.length} files selected`;
            displayProjectFileStructure(autoDeactivatedFolders);
            inputText.value = ''; 
            projectProcessingProgressDiv.textContent = '';
        } else {
            folderNameDisplay.textContent = 'No folder chosen';
            projectFileStructureDiv.innerHTML = '';
            projectProcessingProgressDiv.textContent = '';
        }
        resetOutputs();
        downloadProjectButton.style.display = 'none';
        projectProgressBar.style.display = 'none';
        projectProgressBar.value = 0;
    });

    function shouldSkipFile(filePath, rootIsDotOrUnderscore = false) {
        const lowerPath = filePath.toLowerCase();
        const skippedExtensions = [
            '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', 
            '.exe', '.dll', '.so', '.dylib', '.bin', '.app', '.msi', '.deb', '.rpm',
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp',
            '.mp3', '.wav', '.aac', '.ogg', '.flac',
            '.mp4', '.avi', '.mov', '.wmv', '.mkv', '.flv',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.iso', '.img', '.dmg'
        ];
        if (skippedExtensions.some(ext => lowerPath.endsWith(ext))) return true;
        // #* Deactivate files in folders starting with a dot or __ (but allow re-enabling)
        const parts = filePath.split(/[\\\/]/);
        if (!rootIsDotOrUnderscore) {
            if (parts.some(part => part.startsWith('.') && part.length > 1)) return 'dotfolder';
            if (parts.some(part => part.startsWith('__') && part.length > 2)) return 'underscorefolder';
        }
        return false;
    }

    function displayProjectFileStructure(autoDeactivatedFolders = new Set()) {
        projectFileStructureDiv.innerHTML = '';
        if (projectFilesData.length === 0) return;
        if (autoDeactivatedFolders.size > 0) {
            const warnBox = document.createElement('div');
            warnBox.className = 'dotfolder-warning';
            warnBox.style.background = '#222';
            warnBox.style.color = '#ffb300';
            warnBox.style.border = '1px solid #444';
            warnBox.style.marginBottom = '10px';
            warnBox.style.padding = '8px 12px';
            warnBox.style.borderRadius = '6px';
            warnBox.style.fontWeight = 'bold';
            warnBox.style.position = 'relative';

            const header = document.createElement('div');
            header.style.cursor = 'pointer';
            header.innerHTML = `⚠️ Some folders were automatically deactivated (click to expand)`;
            header.onclick = () => warnBox.classList.toggle('open');
            warnBox.appendChild(header);

            const content = document.createElement('div');
            content.style.display = 'none';
            content.style.fontWeight = 'normal';
            content.style.marginTop = '8px';
            content.innerHTML = '<b>Auto-deactivated folders:</b><ul style="margin:6px 0 0 18px;">' +
                Array.from(autoDeactivatedFolders).map(f => `<li>${escapeHtml(f)}</li>`).join('') + '</ul>' +
                '<div style="margin-top:6px;font-size:0.95em;">You can re-enable files from these folders by clicking them below.</div>';
            warnBox.appendChild(content);

            warnBox.addEventListener('click', (e) => {
                if (e.target === header) {
                    content.style.display = warnBox.classList.contains('open') ? 'block' : 'none';
                }
            });
            projectFileStructureDiv.appendChild(warnBox);
        }
        const ul = document.createElement('ul');
        projectFilesData.forEach(fileData => {
            const li = document.createElement('li');
            li.id = fileData.id;
            const detailsSpan = fileData.isSkipped ? ` <span class="file-details">(${fileData.details})</span>` : '';
            li.innerHTML = `${escapeHtml(fileData.originalPath)}${detailsSpan}`;
            li.title = fileData.isSkipped ? 'File type automatically skipped' : `Click to ${fileData.isActive ? 'deactivate' : 'activate'}`;
            if (fileData.isSkipped) {
                li.classList.add('skipped-file');
            } else if (fileData.isActive) {
                li.classList.add('active-file');
                li.classList.remove('inactive-file');
            } else {
                li.classList.add('inactive-file');
                li.classList.remove('active-file');
            }
            li.style.cursor = fileData.isSkipped ? 'not-allowed' : 'pointer';
            if (!fileData.isSkipped) {
                li.addEventListener('click', () => {
                    fileData.isActive = !fileData.isActive;
                    if (fileData.isActive) {
                        li.classList.add('active-file');
                        li.classList.remove('inactive-file');
                    } else {
                        li.classList.add('inactive-file');
                        li.classList.remove('active-file');
                    }
                    li.title = `Click to ${fileData.isActive ? 'deactivate' : 'activate'}`;
                    const activeFiles = projectFilesData.filter(fd => fd.isActive && fd.cleanedTextContent !== null).length;
                    if (activeFiles > 0 && Object.keys(cleanedProjectFiles).length > 0) {
                         downloadProjectButton.style.display = 'block';
                    } else {
                         downloadProjectButton.style.display = 'none';
                    }
                });
            }
            ul.appendChild(li);
        });
        projectFileStructureDiv.appendChild(ul);
    }

    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            currentMode = tab.dataset.mode;
            switchMode(currentMode);
        });
    });

    function switchMode(mode) {
        modeTabs.forEach(t => t.classList.remove('active'));
        document.querySelector(`.mode-tab-button[data-mode="${mode}"]`).classList.add('active');

        if (mode === 'normal') {
            normalModeInput.style.display = 'block'; //* Show normal mode inputs
            projectModeInput.style.display = 'none';  //* Hide project mode inputs
            downloadButton.style.display = currentCleanedText ? 'block' : 'none';
            downloadProjectButton.style.display = 'none';
            if (highlightedOutputTabButton) highlightedOutputTabButton.style.display = 'inline-block';
            if (cleanedOutputTabButton) cleanedOutputTabButton.style.display = 'inline-block';
        } else { 
            normalModeInput.style.display = 'none';   //* Hide normal mode inputs
            projectModeInput.style.display = 'block'; //* Show project mode inputs
            downloadButton.style.display = 'none';
            const activeCleanedFiles = projectFilesData.filter(fd => fd.isActive && fd.cleanedTextContent !== null && !fd.isSkipped);
            downloadProjectButton.style.display = activeCleanedFiles.length > 0 ? 'block' : 'none';
            //* In project mode, the "Cleaned Text/Output" tab might not be relevant for individual file content
            //* It will be used for the list of collapsible containers.
            //* "Highlighted Differences" will show the combined highlighted diffs.
            if (highlightedOutputTabButton) highlightedOutputTabButton.style.display = 'inline-block'; 
            if (cleanedOutputTabButton) cleanedOutputTabButton.style.display = 'inline-block';
        }
        //* Reset outputs when switching modes
        resetOutputs();
        //* Ensure the correct output tab is active (e.g., highlighted)
        switchTab('highlightedOutput');
    }

    cleanButton.addEventListener('click', async () => {
        if (currentMode === 'normal') {
            const textToClean = inputText.value;
            if (!textToClean) {
                alert('Please enter text or upload a file to clean.');
                return;
            }
            processSingleText(textToClean);
        } else if (currentMode === 'project') {
            if (projectFilesData.length === 0) {
                alert('Please select a project folder to clean.');
                return;
            }
            await processProjectFiles();
        }
    });

    function processSingleText(textToClean) {
        const start = performance.now();
        const { cleanedText, highlightedHtml, stats } = cleanUnicodeChars(textToClean, currentUnicodeCharsToRemove);
        const end = performance.now();
        const timeTaken = ((end - start) / 1000).toFixed(2);
        currentCleanedText = cleanedText;

        cleanedOutput.textContent = cleanedText;
        highlightedOutput.innerHTML = highlightedHtml;
        displayStats(stats, null, timeTaken);

        downloadButton.style.display = (cleanedText || highlightedHtml) ? 'block' : 'none';
        downloadProjectButton.style.display = 'none';
        switchTab('highlightedOutput');
    }

    async function processProjectFiles() {
        if (!window.JSZip) {
            alert('JSZip library is not loaded. Project processing is unavailable.');
            projectProcessingProgressDiv.textContent = 'Error: JSZip not loaded.';
            return;
        }

        const activeFilesToProcess = projectFilesData.filter(f => f.isActive && !f.isSkipped);
        if (activeFilesToProcess.length === 0) {
            alert('No files are activated for cleaning in the project (or all active files are of skipped types).');
            projectProcessingProgressDiv.textContent = 'No processable active files.';
            projectProgressBar.style.display = 'none';
            return;
        }

        cleanedProjectFiles = {};
        let totalStats = {};
        currentUnicodeCharsToRemove.forEach(char => { totalStats[char] = 0; });
        
        highlightedOutput.innerHTML = ''; 
        cleanedOutput.innerHTML = ''; 

        let filesProcessedCount = 0;
        const totalFilesToProcess = activeFilesToProcess.length;
        let currentFileLi = null; 
        let startTime = performance.now(); 
        let hasProcessingError = false; // Flag to track errors

        cleanButton.disabled = true;
        projectProcessingProgressDiv.textContent = `Starting processing... 0/${totalFilesToProcess}`;
        projectProgressBar.style.display = 'block';
        projectProgressBar.value = 0;

        const initialHighlightMessage = '<p class="placeholder-text">Processing project files... Highlighted differences will appear here in collapsible sections.</p>';
        const initialCleanedMessage = '<p class="placeholder-text">Processing project files... Cleaned content will appear here in collapsible sections.</p>';
        highlightedOutput.innerHTML = initialHighlightMessage;
        cleanedOutput.innerHTML = initialCleanedMessage;
        statsOutput.innerHTML = '<p>Gathering statistics...</p>';
        downloadProjectButton.style.display = 'none';

        for (let i = 0; i < totalFilesToProcess; i++) {
            const fileData = activeFilesToProcess[i];
            projectProcessingProgressDiv.textContent = `Processing (${i + 1}/${totalFilesToProcess}): ${fileData.originalPath}`;
            projectProgressBar.value = ((i + 1) / totalFilesToProcess) * 100;
            
            document.querySelectorAll('.project-files-display li').forEach(li => li.classList.remove('processing-file'));
            currentFileLi = document.getElementById(fileData.id); 
            if (currentFileLi) currentFileLi.classList.add('processing-file');

            try {
                const text = await fileData.file.text();
                const { cleanedText, highlightedHtml, stats } = cleanUnicodeChars(text, currentUnicodeCharsToRemove);
                
                fileData.cleanedTextContent = cleanedText;
                fileData.stats = stats; 
                cleanedProjectFiles[fileData.originalPath] = cleanedText;
                
                //* Create collapsible container for highlighted output
                const highlightContainer = document.createElement('div');
                highlightContainer.className = 'output-file-container';
                const highlightHeader = document.createElement('div');
                highlightHeader.className = 'output-file-header';
                highlightHeader.innerHTML = `${escapeHtml(fileData.originalPath)} <span class="toggle-icon"></span>`;
                highlightHeader.onclick = () => highlightContainer.classList.toggle('open');
                const highlightContentDiv = document.createElement('div');
                highlightContentDiv.className = 'output-file-content';
                highlightContentDiv.innerHTML = highlightedHtml; //* Use innerHTML for highlighted content
                
                //* Create summary for highlighted output
                const highlightSummaryDiv = document.createElement('div');
                highlightSummaryDiv.className = 'output-file-summary'; //* Add a class for styling if needed
                let fileSpecificTotalRemoved = 0;
                if (stats) {
                    for (const char in stats) {
                        if (stats[char] > 0) {
                            fileSpecificTotalRemoved += stats[char];
                        }
                    }
                }
                highlightSummaryDiv.textContent = `Summary: ${fileSpecificTotalRemoved} character(s) removed in this file.`;
                highlightSummaryDiv.style.padding = '5px 10px'; //* Basic styling
                highlightSummaryDiv.style.fontSize = '0.9em';
                highlightSummaryDiv.style.backgroundColor = '#202020';
                highlightSummaryDiv.style.borderTop = '1px solid #333';

                highlightContainer.appendChild(highlightHeader);
                highlightContainer.appendChild(highlightContentDiv);
                highlightContainer.appendChild(highlightSummaryDiv); //* Add summary to the container

                if (i === 0) highlightedOutput.innerHTML = ''; //* Clear initial message
                highlightedOutput.appendChild(highlightContainer);
            
                //* Create collapsible container for cleaned output
                const cleanedContainer = document.createElement('div');
                cleanedContainer.className = 'output-file-container';
                const cleanedHeader = document.createElement('div');
                cleanedHeader.className = 'output-file-header';
                cleanedHeader.innerHTML = `${escapeHtml(fileData.originalPath)} <span class="toggle-icon"></span>`;
                cleanedHeader.onclick = () => cleanedContainer.classList.toggle('open');
                const cleanedContentDiv = document.createElement('div');
                cleanedContentDiv.className = 'output-file-content';
                cleanedContentDiv.textContent = cleanedText;
                cleanedContainer.appendChild(cleanedHeader);
                cleanedContainer.appendChild(cleanedContentDiv);
                if (i === 0) cleanedOutput.innerHTML = ''; //* Clear initial message
                cleanedOutput.appendChild(cleanedContainer);

                for (const char in stats) {
                    if (stats[char] > 0) { 
                        totalStats[char] = (totalStats[char] || 0) + stats[char];
                    }
                }
                filesProcessedCount++;
            } catch (error) {
                console.error(`Error processing file ${fileData.originalPath}:`, error);
                hasProcessingError = true; // Set error flag
                const errorMessage = `<p class="error-message">Error processing file: ${escapeHtml(error.message)}</p>`;

                //* Add error to highlighted output section
                const highlightErrorContainer = document.createElement('div');
                highlightErrorContainer.className = 'output-file-container open';
                const highlightErrorHeader = document.createElement('div');
                highlightErrorHeader.className = 'output-file-header';
                highlightErrorHeader.innerHTML = `${escapeHtml(fileData.originalPath)} - ERROR <span class="toggle-icon"></span>`;
                highlightErrorHeader.onclick = () => highlightErrorContainer.classList.toggle('open');
                const highlightErrorContent = document.createElement('div');
                highlightErrorContent.className = 'output-file-content';
                highlightErrorContent.innerHTML = errorMessage;
                highlightErrorContainer.appendChild(highlightErrorHeader);
                highlightErrorContainer.appendChild(highlightErrorContent);
                //* Add a placeholder for summary in case of error, or omit
                const errorSummaryDiv = document.createElement('div');
                errorSummaryDiv.className = 'output-file-summary';
                errorSummaryDiv.textContent = 'Summary: Error processing file.';
                errorSummaryDiv.style.padding = '5px 10px';
                errorSummaryDiv.style.fontSize = '0.9em';
                errorSummaryDiv.style.backgroundColor = '#202020';
                errorSummaryDiv.style.borderTop = '1px solid #333';
                highlightErrorContainer.appendChild(errorSummaryDiv);

                if (i === 0 && filesProcessedCount === 0) highlightedOutput.innerHTML = '';
                highlightedOutput.appendChild(highlightErrorContainer);
                
                //* Add error to cleaned output section
                const cleanedErrorContainer = document.createElement('div');
                cleanedErrorContainer.className = 'output-file-container open';
                const cleanedErrorHeader = document.createElement('div');
                cleanedErrorHeader.className = 'output-file-header';
                cleanedErrorHeader.innerHTML = `${escapeHtml(fileData.originalPath)} - ERROR <span class="toggle-icon"></span>`;
                cleanedErrorHeader.onclick = () => cleanedErrorContainer.classList.toggle('open');
                const cleanedErrorContent = document.createElement('div');
                cleanedErrorContent.className = 'output-file-content';
                cleanedErrorContent.innerHTML = errorMessage;
                cleanedErrorContainer.appendChild(cleanedErrorHeader);
                cleanedErrorContainer.appendChild(cleanedErrorContent);
                if (i === 0 && filesProcessedCount === 0) cleanedOutput.innerHTML = '';
                cleanedOutput.appendChild(cleanedErrorContainer);
            }
            
            if (currentFileLi) currentFileLi.classList.remove('processing-file');
            await new Promise(resolve => setTimeout(resolve, 0)); 
        }
        if (currentFileLi) { 
            currentFileLi.classList.remove('processing-file');
        }

        let endTime = performance.now(); 
        let timeTaken = ((endTime - startTime) / 1000).toFixed(2); 
        lastProjectProcessingTime = timeTaken; 

        cleanButton.disabled = false;
        projectProcessingProgressDiv.textContent = `Processing complete. ${filesProcessedCount}/${totalFilesToProcess} active files processed in ${timeTaken}s.`;
        projectProgressBar.value = 100;

        if (filesProcessedCount > 0 && !hasProcessingError) { // Check error flag here
            if (highlightedOutput.children.length === 0) {
                highlightedOutput.innerHTML = '<p class="placeholder-text">No differences to show (or only errors occurred).</p>';
            }
            if (cleanedOutput.children.length === 0) {
                cleanedOutput.innerHTML = '<p class="placeholder-text">No files were successfully processed.</p>';
            }
            displayStats(totalStats, filesProcessedCount, timeTaken);
            downloadProjectButton.style.display = 'block';
            switchTab('highlightedOutput');
        } else {
            if (highlightedOutput.children.length === 0) {
                 highlightedOutput.innerHTML = '<p class="placeholder-text">No differences to show for active files.</p>';
            }
            if (cleanedOutput.children.length === 0) {
                 cleanedOutput.innerHTML = '<p class="placeholder-text">No active files were processed from the project.</p>';
            }
            if (hasProcessingError) {
                statsOutput.innerHTML = '<p class="placeholder-text">Processing completed with errors. Statistics might be incomplete.</p>';
            } else {
                statsOutput.innerHTML = '<p class="placeholder-text">No statistics to show for active files.</p>';
            }
            downloadProjectButton.style.display = 'none'; // Ensure button is hidden if errors or no files
        }
    }

    downloadButton.addEventListener('click', () => {
        if (currentCleanedText) {
            const blob = new Blob([currentCleanedText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = getCleanedFileName(originalFileName);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });

    downloadProjectButton.addEventListener('click', async () => {
        if (!window.JSZip) {
            alert('JSZip library is not loaded. Cannot create ZIP.');
            return;
        }

        if (projectFilesData.length === 0) {
            alert('No project files available to download.');
            return;
        }

        const zip = new JSZip();
        // Add all files, using cleaned content if available, otherwise original
        for (const fileData of projectFilesData) {
            if (fileData.cleanedTextContent !== null) {
                zip.file(fileData.originalPath, fileData.cleanedTextContent);
            } else {
                // Add original file (as text if possible, otherwise as Blob)
                try {
                    // Try to read as text, fallback to Blob if error
                    const text = await fileData.file.text();
                    zip.file(fileData.originalPath, text);
                } catch (e) {
                    zip.file(fileData.originalPath, fileData.file);
                }
            }
        }

        // Generate analysis file content (only for cleaned files)
        let analysisContent = `Unicode Cleaning Analysis - ${new Date().toLocaleString()}\n`;
        if (lastProjectProcessingTime) {
            analysisContent += `Processing time for this batch: ${lastProjectProcessingTime}s\n`;
        }
        const cleanedFiles = projectFilesData.filter(fd => fd.cleanedTextContent !== null && !fd.isSkipped);
        analysisContent += `Total files cleaned and included in ZIP: ${cleanedFiles.length}\n\n`;
        analysisContent += `--- Per-File Analysis ---\n\n`;

        let aggregatedAnalysisStats = {};
        currentUnicodeCharsToRemove.forEach(char => aggregatedAnalysisStats[char] = 0);
        let totalRemovedInAnalysis = 0;

        cleanedFiles.forEach(fileData => {
            analysisContent += `File: ${escapeHtml(fileData.originalPath)}\n`;
            if (fileData.stats) {
                let fileSpecificCharsFound = false;
                let fileSpecificTotalRemoved = 0;
                for (const char in fileData.stats) {
                    if (fileData.stats[char] > 0) {
                        fileSpecificCharsFound = true;
                        const charCode = char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
                        analysisContent += `  - Removed U+${charCode} (${escapeHtml(char)}): ${fileData.stats[char]}\n`;
                        aggregatedAnalysisStats[char] = (aggregatedAnalysisStats[char] || 0) + fileData.stats[char];
                        totalRemovedInAnalysis += fileData.stats[char];
                        fileSpecificTotalRemoved += fileData.stats[char];
                    }
                }
                if (!fileSpecificCharsFound) {
                    analysisContent += `  - No targeted Unicode characters found or removed in this file.\n`;
                }
                analysisContent += `  - Total removed in this file: ${fileSpecificTotalRemoved}\n`;
            } else {
                analysisContent += `  - Statistics not available for this file (should have been processed).\n`;
            }
            analysisContent += `\n`;
        });
        
        analysisContent += `--- Aggregated Summary ---\n`;
        let foundCharsInAggregatedSummary = false;
        for (const char in aggregatedAnalysisStats) {
            if (aggregatedAnalysisStats[char] > 0) {
                foundCharsInAggregatedSummary = true;
                const charCode = char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
                analysisContent += `  - U+${charCode} (${escapeHtml(char)}): ${aggregatedAnalysisStats[char]}\n`;
            }
        }
        if (!foundCharsInAggregatedSummary) {
            analysisContent += `  No targeted Unicode characters were found or removed in the processed files.\n`;
        }
        analysisContent += `\nTotal targeted characters removed across all cleaned files: ${totalRemovedInAnalysis}\n`;

        zip.file('.noai-analyse', analysisContent);

        zip.generateAsync({ type: 'blob' })
            .then(function(content) {
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'cleaned_project.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(err => {
                console.error('Error generating ZIP file:', err);
                alert('Error generating ZIP file: ' + err.message);
            });
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });

    function switchTab(activeTabId) {
        tabs.forEach(t => {
            t.classList.remove('active');
            if (t.dataset.tab === activeTabId) {
                t.classList.add('active');
            }
        });
        outputContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === activeTabId) {
                content.classList.add('active');
            }
        });
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function cleanUnicodeChars(text, charsToRemove) {
        let cleanedText = text;
        let stats = {};
        // Filter out empty, whitespace, oder ungültige Einträge
        const filteredChars = (charsToRemove || []).map(c => typeof c === 'string' ? c.trim() : '').filter(c => c && c.length > 0);
        console.log('[Unicode-AI][DEBUG] filteredChars:', filteredChars);
        filteredChars.forEach(char => { stats[char] = 0; });
        let highlightedHtml = '';
        if (filteredChars.length === 0) {
            console.log('[Unicode-AI][DEBUG] Keine Zeichen zum Entfernen gefunden.');
            return { cleanedText: text, highlightedHtml: escapeHtml(text), stats: {} };
        }
        // Escape für Regex-CharClass
        const escapeForCharClass = c => c.replace(/[\\\]\[\-^]/g, r => '\\' + r);
        const charClass = filteredChars.map(escapeForCharClass).join('');
        const regex = new RegExp('[' + charClass + ']', 'g');
        console.log('[Unicode-AI][DEBUG] Regex:', regex);
        let match;
        let lastIndex = 0;
        let removedChars = [];
        while ((match = regex.exec(text)) !== null) {
            const foundChar = match[0];
            removedChars.push(foundChar);
            highlightedHtml += escapeHtml(text.substring(lastIndex, match.index));
            highlightedHtml += `<span class=\"highlight-removed\" title=\"Removed: U+${foundChar.charCodeAt(0).toString(16).padStart(4, '0')}\">${escapeHtml(foundChar)}</span>`;
            lastIndex = regex.lastIndex;
            if (stats.hasOwnProperty(foundChar)) stats[foundChar] = (stats[foundChar] || 0) + 1;
        }
        highlightedHtml += escapeHtml(text.substring(lastIndex));
        cleanedText = text.replace(regex, '');
        let wasCharRemoved = Object.values(stats).some(v => v > 0);
        if (!wasCharRemoved) {
            highlightedHtml = escapeHtml(text);
        }
        console.log('[Unicode-AI][DEBUG] removedChars:', removedChars);
        console.log('[Unicode-AI][DEBUG] cleanedText:', cleanedText);
        return { cleanedText, highlightedHtml, stats };
    }

    function displayStats(stats, fileCount = null, timeTaken = null) {
        statsOutput.innerHTML = '';
        const ul = document.createElement('ul');
        let totalRemoved = 0;
        let charactersFound = false;
        const allCharsStats = {};
        (currentUnicodeCharsToRemove || []).forEach(char => {
            allCharsStats[char] = stats[char] || 0;
        });
        if (fileCount !== null) {
            const p = document.createElement('p');
            p.textContent = `Statistics for ${fileCount} processed active file(s):`;
            statsOutput.appendChild(p);
        }
        if (timeTaken !== null) {
            const pTime = document.createElement('p');
            pTime.textContent = `Processing time: ${timeTaken}s`;
            statsOutput.appendChild(pTime);
        }
        for (const char in allCharsStats) {
            if (allCharsStats[char] > 0) {
                charactersFound = true;
            }
            if (fileCount !== null || allCharsStats[char] > 0) {
                const li = document.createElement('li');
                const charCode = char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
                li.innerHTML = `U+${charCode} (<code>${escapeHtml(char)}</code>): ${allCharsStats[char]} time(s)`;
                ul.appendChild(li);
                totalRemoved += allCharsStats[char];
            }
        }
        if (fileCount !== null && !charactersFound && totalRemoved === 0) {
            statsOutput.appendChild(document.createTextNode('No targeted Unicode characters found or removed in active files.'));
        } else if (fileCount === null && !charactersFound) {
            statsOutput.innerHTML = '<p class="placeholder-text">No targeted Unicode characters found or removed. Warning: You should Copy the end Product either way. Because some Unicharacters Automaticle get changed when Uploaded! For Example: —.</p>';
        } else {
            const pTotal = document.createElement('p');
            if (totalRemoved > 0) {
                pTotal.textContent = `Total targeted characters removed: ${totalRemoved}`;
            } else {
                pTotal.textContent = 'No targeted characters were removed from active files.';
            }
            statsOutput.appendChild(pTotal);
            if (ul.hasChildNodes()) {
                statsOutput.appendChild(ul);
            }
        }
    }

    function getCleanedFileName(originalName) {
        const parts = originalName.split('.');
        if (parts.length > 1) {
            const ext = parts.pop();
            return `${parts.join('.')}_cleaned.${ext}`;
        }
        return `${originalName}_cleaned`;
    }

    function resetOutputs() {
        highlightedOutput.innerHTML = '<p class="placeholder-text">Differences will be shown here...</p>';
        cleanedOutput.innerHTML = '<p class="placeholder-text">Cleaned output will appear here...</p>';
        statsOutput.innerHTML = '<p class="placeholder-text">Statistics will be shown here...</p>';
        currentCleanedText = '';
        if (currentMode === 'normal') {
            downloadButton.style.display = 'none';
        } else {
            downloadProjectButton.style.display = 'none';
        }
        // hehe
        // projectFilesData.forEach(fd => { // Reset cleaned content for project files
        //     fd.cleanedTextContent = null;
        //     fd.stats = null;
        // });
        // cleanedProjectFiles = {}; // Clear the object for ZIP download
        // projectProcessingProgressDiv.textContent = '';
        // projectProgressBar.style.display = 'none';
        // projectProgressBar.value = 0;
        // if (projectFileStructureDiv) displayProjectFileStructure(); // Refresh file structure display
    }
    
    //! Init setup
    switchMode('normal'); 
    switchTab('highlightedOutput');

    // --- Zeichen wählen Modal ---
    const chooseCharsButton = document.getElementById('chooseCharsButton');
    const chooseCharsModal = document.getElementById('chooseCharsModal');
    const charGrid = document.getElementById('charGrid');
    const addSelectedCharsButton = document.getElementById('addSelectedCharsButton');
    const closeChooseCharsModal = document.getElementById('closeChooseCharsModal');

    // Zeichenliste: Buchstaben (A-Z, a-z), Zahlen (0-9)
    const selectableChars = [];
    for (let i = 65; i <= 90; i++) selectableChars.push(String.fromCharCode(i)); // A-Z
    for (let i = 97; i <= 122; i++) selectableChars.push(String.fromCharCode(i)); // a-z
    // for (let i = 48; i <= 57; i++) selectableChars.push(String.fromCharCode(i)); // 0-9

    function renderCharGrid() {
        charGrid.innerHTML = '';
        selectableChars.forEach(char => {
            const btn = document.createElement('button');
            btn.textContent = char;
            btn.className = 'char-select-btn';
            btn.style.margin = '2px';
            btn.style.width = '32px';
            btn.style.height = '32px';
            btn.style.fontSize = '1.1em';
            btn.style.borderRadius = '4px';
            btn.style.border = '1px solid #444';
            btn.style.background = '#222';
            btn.style.color = '#fff';
            btn.style.cursor = 'pointer';
            btn.setAttribute('data-char', char);
            btn.onclick = () => {
                btn.classList.toggle('selected');
                if (btn.classList.contains('selected')) {
                    btn.style.background = '#4CAF50';
                    btn.style.border = '2px solid #4CAF50';
                } else {
                    btn.style.background = '#222';
                    btn.style.border = '1px solid #444';
                }
            };
            charGrid.appendChild(btn);
        });
    }

    if (chooseCharsButton && chooseCharsModal) {
        chooseCharsButton.addEventListener('click', () => {
            renderCharGrid();
            chooseCharsModal.style.display = 'block';
        });
    }
    if (closeChooseCharsModal) {
        closeChooseCharsModal.addEventListener('click', () => {
            chooseCharsModal.style.display = 'none';
        });
    }
    if (addSelectedCharsButton) {
        addSelectedCharsButton.addEventListener('click', () => {
            const selected = Array.from(charGrid.querySelectorAll('.selected')).map(btn => btn.getAttribute('data-char'));
            if (selected.length > 0) {
                // Unicode Notation (U+....)
                const lines = unicodeCharsTextarea.value.split(/\r?\n/).map(l => l.trim()).filter(l => l);
                selected.forEach(char => {
                    const code = char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
                    const uStr = `U+${code}`;
                    if (!lines.includes(uStr)) lines.push(uStr);
                });
                unicodeCharsTextarea.value = lines.join('\n');
                saveCharsToStorage(); //* Update
            }
            chooseCharsModal.style.display = 'none';
        });
    }
});