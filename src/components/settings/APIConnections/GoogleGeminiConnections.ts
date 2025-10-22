import { Setting, SettingTab, setIcon } from 'obsidian';
import { fetchGoogleGeminiModels } from 'src/components/FetchModelList';
import DocscribeGPT from 'src/main';

export function addGoogleGeminiConnectionSettings(containerEl: HTMLElement, plugin: DocscribeGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', { text: 'Google Gemini' });

    const initialState = plugin.settings.toggleGoogleGeminiSettings;
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
            plugin.settings.toggleGoogleGeminiSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleGoogleGeminiSettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
    .setName('Google Gemini API Key')
    .setDesc('Insert Google Gemini API Key.')
    .addText(text => text
        .setPlaceholder('insert-api-key')
        .setValue(plugin.settings.APIConnections.googleGemini.APIKey ? `${plugin.settings.APIConnections.googleGemini.APIKey.slice(0, 6)}-...${plugin.settings.APIConnections.googleGemini.APIKey.slice(-4)}` : '')
        .onChange(async (value) => {
            plugin.settings.APIConnections.googleGemini.geminiModels = [];
            plugin.settings.APIConnections.googleGemini.APIKey = value;
            if (plugin.settings.APIConnections.googleGemini.APIKey === '') {
                plugin.settings.APIConnections.googleGemini.geminiModels = [];
            }
            else {
                const models = await fetchGoogleGeminiModels(plugin);
                models.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.googleGemini.geminiModels.includes(model)) {
                        plugin.settings.APIConnections.googleGemini.geminiModels.push(model);
                    }
                });
            }
        })
        .inputEl.addEventListener('focusout', async () => {
            await plugin.saveSettings();
            SettingTab.display();
        })
    );

    new Setting(settingsContainer)
    .setName('Enable Stream')
    .setDesc('Enable Google Gemini models to stream response.')
    .addToggle((toggle) =>
        toggle.setValue(plugin.settings.APIConnections.googleGemini.enableStream).onChange((value) => {
            plugin.settings.APIConnections.googleGemini.enableStream = value;
            plugin.saveSettings();
        })
    );
}