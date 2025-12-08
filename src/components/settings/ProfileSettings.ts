import { Setting, SettingTab, TFile, TFolder, setIcon } from 'obsidian';
import DocscribeGPT, { DEFAULT_SETTINGS, updateSettingsFromFrontMatter } from 'src/main';


// Profile Settings
export function addProfileSettings(containerEl: HTMLElement, plugin: DocscribeGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'Profile settings'});

    const initialState = plugin.settings.toggleProfileSettings;
    const chevronIcon = toggleSettingContainer.createEl('span', { cls: 'chevron-icon' });
    setIcon(chevronIcon, initialState ? 'chevron-down' : 'chevron-right');

    // Create the settings container to be toggled
    const settingsContainer = containerEl.createDiv({ cls: 'settingsContainer' });
    settingsContainer.classList.toggle('hidden', !initialState);

    // Toggle visibility
    toggleSettingContainer.addEventListener('click', () => {
        const isOpen = !settingsContainer.classList.contains('hidden');
        if (isOpen) {
            setIcon(chevronIcon, 'chevron-right'); // Close state
            settingsContainer.classList.add('hidden');
            plugin.settings.toggleProfileSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.classList.remove('hidden');
            plugin.settings.toggleProfileSettings = true;
        }
        plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
    });

    new Setting(settingsContainer)
    .setName('Profile')
    .setDesc('Select a profile.')
    .addDropdown(dropdown => {

        if (plugin.settings.profiles.profileFolderPath !== '') {
            // Fetching files from the specified folder
            const files = plugin.app.vault.getFiles().filter((file) => file.path.startsWith(plugin.settings.profiles.profileFolderPath));
        
            // Sorting the files array alphabetically by file name
            files.sort((a, b) => a.name.localeCompare(b.name));
        
            const dataFolderPath = plugin.app.vault.configDir + '/plugins/docscribe/data/';
            
            if (!plugin.app.vault.getAbstractFileByPath(dataFolderPath)) {
                plugin.app.vault.adapter.mkdir(dataFolderPath).catch((err) => {
                    console.error('Failed to create data folder:', err);
                });
            }
        
            files.forEach((file) => {
                if (file instanceof TFile) {
                    const fileName = file.basename;
                    const newFileName = `messageHistory_${fileName}.json`;
                    const newFilePath = `${dataFolderPath}${newFileName}`;
        
                    plugin.app.vault.create(newFilePath, '')
                    .catch((err) => {
                        console.error('Failed to create message history file:', err);
                    });

                    // Adding the file name as a dropdown option
                    dropdown.addOption(file.name, fileName);
                }
            });

        }

        dropdown
        .setValue(plugin.settings.profiles.profile || DEFAULT_SETTINGS.profiles.profile)
        .onChange(async (value) => {
            plugin.settings.profiles.profile = value ? value : DEFAULT_SETTINGS.profiles.profile;
            const profileFilePath = plugin.settings.profiles.profileFolderPath + '/' + plugin.settings.profiles.profile;
            const currentProfile = plugin.app.vault.getAbstractFileByPath(profileFilePath);
            if (!(currentProfile instanceof TFile)) {
                console.warn('Profile file is not a valid TFile:', profileFilePath);
            return; // or throw, or handle as appropriate in your context
            }
            plugin.activateView().catch(err => {console.error('Failed to activate view:', err);});
            await updateSettingsFromFrontMatter(plugin, currentProfile);
            plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
            void SettingTab.display();
        })
        
    });

    new Setting(settingsContainer)
        .setName('Profile folder path')
        .setDesc('Select a profile from a specified folder.')
        .addText(text => text
            .setPlaceholder('DocScribe profiles')
            .setValue(plugin.settings.profiles.profileFolderPath || DEFAULT_SETTINGS.profiles.profileFolderPath)
            .onChange(async (value) => {
                plugin.settings.profiles.profileFolderPath = value ? value : DEFAULT_SETTINGS.profiles.profileFolderPath;
                if (value) {
                    let folderPath = plugin.settings.profiles.profileFolderPath.trim() || DEFAULT_SETTINGS.profiles.profileFolderPath;
                    
                    // Remove trailing '/' if it exists
                    while (folderPath.endsWith('/')) {
                        folderPath = folderPath.substring(0, folderPath.length - 1);
                        plugin.settings.profiles.profileFolderPath = folderPath;
                    }
                    
                    const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
                    
                    if (folder && folder instanceof TFolder) {
                        text.inputEl.classList.remove('is-invalid');
                    } else {
                        text.inputEl.classList.add('is-invalid');
                    }
                }
                plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
            })
            .inputEl.addEventListener('focusout', () => {
                void SettingTab.display();
            })
        );
}