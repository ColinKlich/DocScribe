import { Setting, SettingTab, TFolder, setIcon } from 'obsidian';
import DocscribeGPT, { DEFAULT_SETTINGS } from 'src/main';

export function addChatHistorySettings(containerEl: HTMLElement, plugin: DocscribeGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'Chat history'});

    const initialState = plugin.settings.toggleChatHistorySettings;
    const chevronIcon = toggleSettingContainer.createEl('span', { cls: 'chevron-icon' });
    setIcon(chevronIcon, initialState ? 'chevron-down' : 'chevron-right');

    // Create the settings container to be toggled
    const settingsContainer = containerEl.createDiv({ cls: 'settingsContainer' });
    settingsContainer.style.display = initialState ? 'block' : 'none';

    // Toggle visibility
    toggleSettingContainer.addEventListener('click', async () => {
        const isOpen = settingsContainer.style.display !== 'none';
        if (isOpen) {
            setIcon(chevronIcon, 'chevron-right'); // Close state
            settingsContainer.style.display = 'none';
            plugin.settings.toggleChatHistorySettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleChatHistorySettings = true;
        }
        plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
    });

    new Setting(settingsContainer)
        .setName('Chat history folder path')
        .setDesc('Save your chat history in a specified folder.')
        .addText(text => text
            .setPlaceholder('Docscribe/History')
            .setValue(plugin.settings.chatHistory.chatHistoryPath || DEFAULT_SETTINGS.chatHistory.chatHistoryPath)
            .onChange(async (value) => {
                plugin.settings.chatHistory.chatHistoryPath = value ? value : DEFAULT_SETTINGS.chatHistory.chatHistoryPath;
                if (value) {
                    let folderPath = plugin.settings.chatHistory.chatHistoryPath.trim() || DEFAULT_SETTINGS.chatHistory.chatHistoryPath;
                    
                    // Remove trailing '/' if it exists
                    while (folderPath.endsWith('/')) {
                        folderPath = folderPath.substring(0, folderPath.length - 1);
                        plugin.settings.chatHistory.chatHistoryPath = folderPath;
                    }
                    
                    const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
                    
                    if (folder && folder instanceof TFolder) {
                        text.inputEl.style.borderColor = ''; 
                    } else {
                        text.inputEl.style.borderColor = 'red'; 
                    }
                }
                plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
            })
            .inputEl.addEventListener('focusout', () => {
            void SettingTab.display();
            })
        );

    new Setting(settingsContainer)
        .setName('Template file path')
        .setDesc('Insert your template file path.')
        .addText(text => text
            .setPlaceholder('templates/Docscribe.md')
            .setValue(plugin.settings.chatHistory.templateFilePath || DEFAULT_SETTINGS.chatHistory.templateFilePath)
            .onChange(async (value) => {
                plugin.settings.chatHistory.templateFilePath = value ? value : DEFAULT_SETTINGS.chatHistory.templateFilePath;
                if (value) {
                    // Check if the provided file path ends with '.md', if not, append it
                    if (!plugin.settings.chatHistory.templateFilePath.endsWith('.md')) {
                        plugin.settings.chatHistory.templateFilePath += '.md';
                    }

                    plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});

                    const allFiles = plugin.app.vault.getFiles(); // Retrieve all files from the vault

                    // Check if the specified file path (including directories) exists in the array of files
                    const fileExists = allFiles.some(file => 
                        file.path.toLowerCase() === plugin.settings.chatHistory.templateFilePath.toLowerCase());
                        
                    if (fileExists) {
                        // // console.log("File exists in vault!");
                        text.inputEl.style.borderColor = '';
                    } else {
                        // // console.log("File does not exist in vault.");
                        text.inputEl.style.borderColor = 'red';
                    }
                } else {
                    // If the input is empty, reset the border color
                    text.inputEl.style.borderColor = '';
                    plugin.settings.chatHistory.templateFilePath = DEFAULT_SETTINGS.chatHistory.templateFilePath;
                }
            })
        );

    new Setting(settingsContainer)
        .setName('Enable rename note title')
        .setDesc('Enable model to rename the note title when saving chat history.')
        .addToggle((toggle) =>
            toggle.setValue(plugin.settings.chatHistory.allowRenameNoteTitle).onChange((value) => {
                plugin.settings.chatHistory.allowRenameNoteTitle = value;
                plugin.saveSettings();
            })
        );
}