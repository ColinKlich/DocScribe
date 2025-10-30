# DocScribe for Obsidian

DocScribe is an intelligent assistant for Obsidian that helps you create notes from your documents. It's powered by a variety of Large Language Models and is designed to streamline your note-taking process, starting with PowerPoint files.

## How to Use DocScribe

Getting started with DocScribe is a simple process.

### 1. Install and Configure

First, you need to install DocScribe from the Obsidian Community Plugins browser. Once installed, you'll need to configure it to use your preferred Large Language Model (LLM).

1.  Go to **Settings** > **Community Plugins** and find **DocScribe**.
2.  Enable the plugin.
3.  Go to the **DocScribe** settings tab.
4.  Select your LLM provider (e.g., OpenAI, Google Gemini, Anthropic).
5.  Enter your API key.

### 2. Generate Notes from a PowerPoint

Once you have DocScribe configured, you can start generating notes from your `.pptx` files.

There are two ways to do this:

*   **Command Menu:** Right-click on a `.pptx` file in the file explorer and select "Generate Notes from PowerPoint".
*   **In-Chat Command:** In any chat window, you can use the following command to generate notes from a PowerPoint file:

    ```
    !![[path/to/your/file.pptx]]
    ```

    Replace `path/to/your/file.pptx` with the relative path to your PowerPoint file.

DocScribe will then extract the text from the PowerPoint, send it to the LLM, and display the generated notes in the chat window.

## Upcoming Features

We are constantly working to improve DocScribe. Here's what's coming soon:

*   **PDF Support:** We are actively working on adding support for `.pdf` files. This feature will be available in a future release.

## Screenshots

**Chat Command:**
![Chat Command](README_images/chat%20insert.png)

**Command Menu:**
![Command Menu](README_images/command%20menu.png)

## Core Features

*   **Wide LLM Support:** Connect to models from Ollama, OpenAI, Google Gemini, Anthropic, Mistral, and any OpenAI-compatible REST API.
*   **Custom Profiles:** Create unique chatbot personalities with specific knowledge, prompts, and presets.
*   **Editor Integration:** Generate ideas, draft content, and rewrite text directly within the Obsidian editor.
*   **Full Markdown Support:** Chat messages are rendered in Obsidian's Markdown, including code blocks, links, and more.

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

## Contributing

Contributions are welcome! If you have a bug fix or an improvement, please feel free to open a pull request. For bugs or feature requests, please create an issue on the GitHub repository.
