import { Setting, SettingTab, setIcon } from 'obsidian';
import { fetchOpenRouterModels } from 'src/components/FetchModelList';
import DocscribeGPT from 'src/main';

export function addOpenRouterConnectionSettings(containerEl: HTMLElement, plugin: DocscribeGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', { text: 'OpenRouter connection' });

    const initialState = plugin.settings.toggleOpenRouterSettings;
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
            plugin.settings.toggleOpenRouterSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.classList.remove('hidden');
            plugin.settings.toggleOpenRouterSettings = true;
        }
        plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
    });

    new Setting(settingsContainer)
    .setName('OpenRouter API key')
    .setDesc('Insert OpenRouter API key.')
    .addText(text => text
        .setPlaceholder('insert-api-key')
        .setValue(plugin.settings.APIConnections.openRouter.APIKey ? `${plugin.settings.APIConnections.openRouter.APIKey.slice(0, 6)}-...${plugin.settings.APIConnections.openRouter.APIKey.slice(-4)}` : '')
        .onChange(async (value) => {
            plugin.settings.APIConnections.openAI.openAIBaseModels = [];
            plugin.settings.APIConnections.openRouter.APIKey = value;
            if (plugin.settings.APIConnections.openRouter.APIKey === '') {
                plugin.settings.APIConnections.openRouter.openRouterModels = [];
            }
            else {
                const models = await fetchOpenRouterModels(plugin);
                models.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.openRouter.openRouterModels.includes(model)) {
                        plugin.settings.APIConnections.openRouter.openRouterModels.push(model);
                    }
                });
            }
        })
        .inputEl.addEventListener('focusout', async () => {
            plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
            void SettingTab.display();
        })
    );
}