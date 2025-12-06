import { Setting, SettingTab, setIcon } from 'obsidian';
import DocscribeGPT, { DEFAULT_SETTINGS } from 'src/main';
import { addDescriptionLink } from 'src/utils/DescriptionLink';
import { fetchRESTAPIURLModels } from '../FetchModelList';

// OpenAI-Based REST API URL Connection Settings
export function addRESTAPIURLSettings(containerEl: HTMLElement, plugin: DocscribeGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'REST API connection'});

    const initialState = plugin.settings.toggleRESTAPIURLSettings;
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
            plugin.settings.toggleRESTAPIURLSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleRESTAPIURLSettings = true;
        }
        plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
    });

    new Setting(settingsContainer)
    .setName('API key')
    .setDesc('Insert API key (optional).')
    .addText(text => text
        .setPlaceholder('insert-api-key')
        .setValue(plugin.settings.RESTAPIURLConnection.APIKey ? `${plugin.settings.RESTAPIURLConnection.APIKey.slice(0, 6)}-...${plugin.settings.RESTAPIURLConnection.APIKey.slice(-4)}` : '')
        .onChange(async (value) => {
            plugin.settings.RESTAPIURLConnection.RESTAPIURLModels = [];
            plugin.settings.RESTAPIURLConnection.APIKey = value;
            plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
        })
.inputEl.addEventListener('focusout', () => {
  void SettingTab.display();
})
    );

    new Setting(settingsContainer)
    .setName('REST API url')
    .setDesc(addDescriptionLink('Enter your REST API url.', 'https://github.com/colinklich/docscribe/wiki/How-to-setup-with-LM-Studio', '', '[Instructions]'))
    .addText(text => text
        .setPlaceholder('http://localhost:1234/v1')
        .setValue(plugin.settings.RESTAPIURLConnection.RESTAPIURL || DEFAULT_SETTINGS.RESTAPIURLConnection.RESTAPIURL)
        .onChange(async (value) => {
                plugin.settings.RESTAPIURLConnection.RESTAPIURLModels = [];
                plugin.settings.RESTAPIURLConnection.RESTAPIURL = value ? value : DEFAULT_SETTINGS.RESTAPIURLConnection.RESTAPIURL;
                if (plugin.settings.RESTAPIURLConnection.RESTAPIURL === '') {
                    plugin.settings.RESTAPIURLConnection.RESTAPIURLModels = [];
                } else {
                    const models = await fetchRESTAPIURLModels(plugin);
                    models.forEach((model: string) => {
                        if (!plugin.settings.RESTAPIURLConnection.RESTAPIURLModels.includes(model)) {
                            plugin.settings.RESTAPIURLConnection.RESTAPIURLModels.push(model);
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