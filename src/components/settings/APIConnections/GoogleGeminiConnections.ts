import { Setting, SettingTab, setIcon } from 'obsidian';
import { fetchGoogleGeminiModels } from 'src/components/FetchModelList';
import DocscribeGPT from 'src/main';

export function addGoogleGeminiConnectionSettings(containerEl: HTMLElement, plugin: DocscribeGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', { text: 'Google Gemini connection' });

    const initialState = plugin.settings.toggleGoogleGeminiSettings;
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
            plugin.settings.toggleGoogleGeminiSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.classList.remove('hidden');
            plugin.settings.toggleGoogleGeminiSettings = true;
        }
        plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
    });

    new Setting(settingsContainer)
    .setName('Google Gemini API key')
    .setDesc('Insert Google Gemini API key.')
    .addText(text => text
        .setPlaceholder('Insert-API-key')
        .setValue(plugin.settings.APIConnections.googleGemini.APIKey ? `${plugin.settings.APIConnections.googleGemini.APIKey.slice(0, 6)}-...${plugin.settings.APIConnections.googleGemini.APIKey.slice(-4)}` : '')
        .onChange(async (value) => {
            plugin.settings.APIConnections.googleGemini.geminiModels = [];
            plugin.settings.APIConnections.googleGemini.APIKey = value;
            if (plugin.settings.APIConnections.googleGemini.APIKey === '') {
                plugin.settings.APIConnections.googleGemini.geminiModels = [];
            }
            else {
                const models = await fetchGoogleGeminiModels(plugin);
                if (models) {
                models.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.googleGemini.geminiModels.includes(model)) {
                        plugin.settings.APIConnections.googleGemini.geminiModels.push(model);
                    }
                });
            }
            }
        })
        .inputEl.addEventListener('focusout', () => {
            plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
            void SettingTab.display();
        })
    );

    
}