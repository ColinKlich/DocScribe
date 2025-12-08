import { Setting, SettingTab, setIcon } from 'obsidian';
import { fetchOpenAIBaseModels } from 'src/components/FetchModelList';
import DocscribeGPT, { DEFAULT_SETTINGS } from 'src/main';

export function addOpenAIConnectionSettings(containerEl: HTMLElement, plugin: DocscribeGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', { text: 'OpenAI connection' });

    const initialState = plugin.settings.toggleOpenAISettings;
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
            plugin.settings.toggleOpenAISettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.classList.remove('hidden');
            plugin.settings.toggleOpenAISettings = true;
        }
        plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
    });

    new Setting(settingsContainer)
    .setName('OpenAI API key')
    .setDesc('Insert OpenAI API key.')
    .addText(text => text
        .setPlaceholder('Insert-API-key')
        .setValue(plugin.settings.APIConnections.openAI.APIKey ? `${plugin.settings.APIConnections.openAI.APIKey.slice(0, 7)}-...${plugin.settings.APIConnections.openAI.APIKey.slice(-4)}` : '')
        .onChange(async (value) => {
            plugin.settings.APIConnections.openAI.openAIBaseModels = [];
            plugin.settings.APIConnections.openAI.APIKey = value;
            if (plugin.settings.APIConnections.openAI.APIKey === '') {
                plugin.settings.APIConnections.openAI.openAIBaseModels = [];
            } else {
                const models = await fetchOpenAIBaseModels(plugin);
                models.forEach((model) => {
                    if (!plugin.settings.APIConnections.openAI.openAIBaseModels.includes(model)) {
                        plugin.settings.APIConnections.openAI.openAIBaseModels.push(model);
                    }
                });
            }
        })
        .inputEl.addEventListener('focusout', () => {
            plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
            void SettingTab.display();
        })
    );

    new Setting(settingsContainer)
        .setName('OpenAI URL')
        .setDesc('Enter your custom OpenAI URL.')
        .addButton(button => button
            .setButtonText('Restore default')
            .setIcon('rotate-cw')
            .setClass('clickable-icon')
            .onClick(async () => {
                plugin.settings.APIConnections.openAI.openAIBaseModels = [];
                plugin.settings.APIConnections.openAI.openAIBaseUrl = DEFAULT_SETTINGS.APIConnections.openAI.openAIBaseUrl;
                plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
                void SettingTab.display();
            })
        )
        .addText(text => text
            .setPlaceholder('https://api.openai.com/v1')
            .setValue(plugin.settings.APIConnections.openAI.openAIBaseUrl || DEFAULT_SETTINGS.APIConnections.openAI.openAIBaseUrl)
            .onChange(async (value) => {
                    plugin.settings.APIConnections.openAI.openAIBaseUrl = value ? value : DEFAULT_SETTINGS.APIConnections.openAI.openAIBaseUrl;
                    plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
                })
            .inputEl.addEventListener('focusout', () => {
                void SettingTab.display();
            })
        );
}