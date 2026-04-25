# FlipWalker Game Benchmark

English | [日本語](README.ja.md)

A benchmark that gives the same puzzle-game prompt to multiple AI coding agents and compares the results. The format is inspired by the [Pelican SVG benchmark](https://simonwillison.net/tags/pelican-riding-a-bicycle/), which gave each model the same single-sentence prompt to draw a pelican riding a bicycle in SVG, then compared the outputs visually to illustrate differences in LLM capability. This benchmark is the game-development equivalent.

## The prompt

> Create a small vanilla JavaScript puzzle game where a character automatically walks back and forth, the player can only flip gravity, and the goal is to get a key and reach a door. Design a well-crafted level with multiple obstacles that require precise gravity flips—both to reach the key and to reach the door. The level should have a clear intended solution path that feels satisfying to solve, with the layout carefully tuned so the character's walk timing and gravity flips align correctly. Test the game by simulating the solution step-by-step, verify the level is completable as intended, and fix any issues that prevent completion.

Each agent was asked to generate three versions from this prompt, and I selected the result that looked best on review.

## Results

### OpenCode / MiniMax M2.5

[OpenCode](https://opencode.ai/) is an open-source AI coding agent that can run with many different LLMs. It supports several free models; as of April 2026, MiniMax M2.5 and Nemotron 3 are among the available options, though the free model lineup changes often.

[Play the demo](https://abagames.github.io/flipwalker-game-benchmark/opencode-minimax/)

The result does not implement the requested automatically walking character. Instead, the player appears to move left and right only while airborne. The yellow circle that seems to be the key is embedded in the floor and cannot be collected.

![](docs/screenshots/opencode-minimax.gif)

### GitHub Copilot CLI / GPT-5 mini high

[GitHub Copilot](https://github.com/features/copilot) is Microsoft's AI coding agent product, provided through GitHub. Even free users can use lightweight LLMs such as GPT-5 mini and Claude Haiku 4.5.

[Play the demo](https://abagames.github.io/flipwalker-game-benchmark/copilot-gpt5mini/)

This entry creates an interesting level without relying on obstacles. However, there is an invisible floor above the top edge of the screen, and being able to use it undermines much of the level's intended design.

![](docs/screenshots/copilot-gpt5mini.gif)

### Gemini CLI / gemini-3-flash-preview

[Gemini CLI](https://geminicli.com/) is Google's open-source AI coding agent. It can use Gemini 3 family models, and free users can access models such as `gemini-3-flash-preview`.

[Play the demo](https://abagames.github.io/flipwalker-game-benchmark/gemini-gemini3flash/)

The basic mechanics are present, but the key is placed near spikes in a way that makes the generated level unsolvable.

![](docs/screenshots/gemini-gemini3flash.gif)

### Amp / Claude Opus 4.6

[Amp](https://ampcode.com/) was notable for offering around $10 of daily LLM usage in exchange for showing advertisements in the CLI. The ads have since been removed, but the $10 daily free usage is still available.

[Play the demo](https://abagames.github.io/flipwalker-game-benchmark/amp-claudeopus46/)

This entry achieves a relatively complex level, though it is easy to solve. The visual details, including the floating key, are well done.

![](docs/screenshots/amp-claudeopus46.gif)

### Codex CLI / GPT-5.4 xhigh

[Codex](https://openai.com/codex/) is OpenAI's coding agent for ChatGPT. It provides access to the latest GPT models under relatively generous rate limits.

[Play the demo](https://abagames.github.io/flipwalker-game-benchmark/codex-gpt54/)

This was the only entry to create a key-operated floor mechanic. The level itself is not especially interesting, and the spike placement is so strict that clearing it is difficult.

![](docs/screenshots/codex-gpt54.gif)

### Codex CLI / GPT-5.5 xhigh

GPT-5.5 is the latest model available through Codex in this benchmark.

[Play the demo](https://abagames.github.io/flipwalker-game-benchmark/codex-gpt55/)

The presentation is polished, but the level design is fairly ordinary and does not make much use of the mechanic of reversing direction upon hitting a wall.

![](docs/screenshots/codex-gpt55.gif)

### Claude Code / Claude Opus 4.7 xHigh

[Claude Code](https://code.claude.com/docs/en/overview) is Anthropic's coding agent. In my view, Claude Opus is strong for vaguely specified creative coding tasks such as making small games.

[Play the demo](https://abagames.github.io/flipwalker-game-benchmark/claudecode-claudeopus47/)

Because this uses the same Claude Opus model family as the Amp entry, the resulting game looks and feels similar. The game structure and visuals are clean, but the level design is not especially interesting.

![](docs/screenshots/claudecode-claudeopus47.gif)

## Overall Takeaway

As of April 2026, current coding agents and LLMs can implement the rules of a gravity-flip puzzle game without much difficulty. The visual quality varies from entry to entry, but most agents produced a broadly appropriate game screen.

Level design is the weaker point. The instruction to "Test the game by simulating the solution step-by-step" can lead agents to build a simulation and verify that some solution exists. However, that does not mean they can create a complex, rewarding level that truly "feels satisfying to solve." Producing a fun puzzle likely requires more detailed design instructions and a verification harness that can evaluate more than mere solvability.
