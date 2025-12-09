import { Setting, SettingTab, setIcon } from 'obsidian';
import DocscribeGPT from 'src/main';
import { ANTHROPIC_MODELS } from 'src/view';

export function addAnthropicConnectionSettings(containerEl: HTMLElement, plugin: DocscribeGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', { text: 'Anthropic connection' });

    const initialState = plugin.settings.toggleAnthropicSettings;
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
            plugin.settings.toggleAnthropicSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.classList.remove('hidden');
            plugin.settings.toggleAnthropicSettings = true;
        }
        plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
    });

    new Setting(settingsContainer)
    .setName('Anthropic API key')
    .setDesc('Insert Anthropic API key.')
    .addText(text => text
        .setPlaceholder('Insert-API-key')
        .setValue(plugin.settings.APIConnections.anthropic.APIKey ? `${plugin.settings.APIConnections.anthropic.APIKey.slice(0, 6)}-...${plugin.settings.APIConnections.anthropic.APIKey.slice(-4)}` : '')
        .onChange( (value) => {
            plugin.settings.APIConnections.anthropic.anthropicModels = [];
            plugin.settings.APIConnections.anthropic.APIKey = value;
            if (plugin.settings.APIConnections.anthropic.APIKey === '') {
                plugin.settings.APIConnections.anthropic.anthropicModels = [];
            } else {
                const models = ANTHROPIC_MODELS;
                models.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.anthropic.anthropicModels.includes(model)) {
                        plugin.settings.APIConnections.anthropic.anthropicModels.push(model);
                    }
                });
            }
        })
        .inputEl.addEventListener('focusout', () => {
            plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
            void SettingTab.display();
        })
    );
}
