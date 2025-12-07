import { Setting, SettingTab, setIcon } from 'obsidian';
import DocscribeGPT, { DEFAULT_SETTINGS } from 'src/main';


export async function addEditorSettings(containerEl: HTMLElement, plugin: DocscribeGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'Editor settings'});

    const initialState = plugin.settings.toggleEditorSettings;
    const chevronIcon = toggleSettingContainer.createEl('span', { cls: 'chevron-icon' });
    setIcon(chevronIcon, initialState ? 'chevron-down' : 'chevron-right');

    // Create the settings container to be toggled
    const settingsContainer = containerEl.createDiv({ cls: 'settingsContainer' });
    settingsContainer.classList.toggle('hidden', !initialState);

    // Toggle visibility
    toggleSettingContainer.addEventListener('click', async () => {
        const isOpen = !settingsContainer.classList.contains('hidden');
        if (isOpen) {
            setIcon(chevronIcon, 'chevron-right'); // Close state
            settingsContainer.classList.add('hidden');
            plugin.settings.toggleEditorSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.classList.remove('hidden');
            plugin.settings.toggleEditorSettings = true;
        }
        await plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
    });

    new Setting(settingsContainer)
        .setName('Editor system role')
        .setDesc('System role for Docscribe generate and \'Prompt Select Generate\' command.')
        .addTextArea(text => text
            .setPlaceholder('You are a helpful assistant.')
            .setValue(plugin.settings.editor.systen_role !== undefined ? plugin.settings.editor.systen_role : DEFAULT_SETTINGS.editor.systen_role)
            .onChange(async (value) => {
                plugin.settings.editor.systen_role = value !== undefined ? value : DEFAULT_SETTINGS.editor.systen_role;
                plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
            })
        );

}