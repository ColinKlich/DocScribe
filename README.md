# Docscribe for Obsidian

Your intelligent companion for brainstorming and note creation in Obsidian, powered by a variety of Large Language Models.

## Core Features

*   **Wide LLM Support:** Connect to models from Ollama, OpenAI, Google Gemini, Anthropic, Mistral, and any OpenAI-compatible REST API.
*   **Editor Integration:** Generate ideas, draft content, and rewrite text directly within the Obsidian editor.
*   **PowerPoint Text Extraction:** Use the `!![[filename.pptx]]` command or the context menu to extract slide content and analyze it with your chosen LLM.
*   **Full Markdown Support:** Chat messages are rendered in Obsidian's Markdown, including code blocks, links, and more.

## Getting Started

1.  **Install:** Find "Docscribe" in the Obsidian Community Plugins browser and install it.
2.  **Configure:** Open the plugin settings and add your API key or the REST API URL for your model provider.
3.  **Chat:** Click the bot icon in the left ribbon to open the chat panel and start a conversation.

<details>
<summary>Available Commands</summary>

*   `/help` - Show help commands.
*   `/model` - List or change model.
*   `/profile` - List or change profiles.
*   `/prompt` - List or change prompts.
*   `/maxtokens [VALUE]` - Set max tokens for the response.
*   `/temp [VALUE]` - Change the temperature (creativity) of the response.
*   `/ref on | off` - Toggle referencing the current note in your conversation.
*   `/append` - Append the current chat history to the active note.
*   `/save` - Save the current chat history to a new note.
*   `/load` - List and load a previous chat history.
*   `/clear` or `/c` - Clear the current chat history.
*   `/stop` or `/s` - Stop the model from generating a response.

</details>

## Future Improvements

We are actively working on improving Docscribe. A key priority is to update the integration with all model providers to use their latest and most capable APIs. This will bring enhanced performance, new features, and broader model support.

## Contributing

Contributions are welcome! If you have a bug fix or an improvement, please feel free to open a pull request. For bugs or feature requests, please create an issue on the GitHub repository.
