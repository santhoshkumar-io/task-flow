# Step 0 — Set up your machine

This is the first thing you do. Nothing else works until this is finished.

You do **not** need Docker for this project. Docker is a tool that runs
software inside a small sealed box. It is useful, but it is one more thing
to learn, and this project does not need it.

Instead you install four things directly on your computer: a way to run
JavaScript, a version tracker for your code, a database, and an editor.

**Time needed:** about 45 minutes, most of it waiting for downloads.

---

## What you are installing, and why

| Thing | What it actually is | Why this project needs it |
|---|---|---|
| **Node.js** | A program that runs JavaScript outside a browser | Your backend server is JavaScript. Without Node it cannot run. |
| **nvm** | A switcher that lets you keep several Node versions | So you can move to a different Node version later without breaking other projects |
| **Git** | A tool that saves snapshots of your code | The assessment asks for meaningful commits |
| **MongoDB** | The database — the place where tasks and users are stored on disk | The assessment requires MongoDB |
| **mongosh** | A text window for talking to the database | To check data quickly and to prove the database is alive |
| **MongoDB Compass** | A window with buttons for looking at the database | Much easier than text when you want to *see* your data |
| **VS Code** | The code editor | Where you write and read the code |
| **Claude Code** | An AI helper that runs in your terminal | You will build each version with it |

A note on words. **Terminal** just means the black window where you type
commands. On a Mac it is the app called Terminal, or the one called iTerm.
On Windows it is the app called PowerShell.

---

## Before you start — check what you already have

Open your terminal and paste these four lines, one at a time.

```bash
node -v
git --version
mongosh --version
code -v
```

Each one either prints a version number, or says `command not found`.

Write down which ones said `command not found`. Those are the only steps
below you actually need to do. Skip the rest.

---

# Part A — macOS

If you are on Windows, jump to Part B.

## A1. Install Homebrew

Homebrew is an installer for developer tools. You type one line, it
downloads and sets up the tool for you.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

When it finishes it prints two or three lines starting with
`eval "$(/opt/homebrew/bin/brew shellenv)"`. **Copy those lines and run
them.** They tell your terminal where Homebrew put things.

Check it worked:

```bash
brew --version
```

You should see something like `Homebrew 4.x.x`.

## A2. Install nvm, then Node

nvm stands for Node Version Manager. It is a switcher. You install it
once, then use it to install Node.

Why not install Node directly? Because six months from now another project
will need a different Node version, and with nvm that is one command
instead of a reinstall.

```bash
brew install nvm
mkdir -p ~/.nvm
```

Now tell your terminal about nvm. Open your shell settings file:

```bash
open -e ~/.zshrc
```

If the file does not exist, create it first with `touch ~/.zshrc` and run
the command again.

Paste these three lines at the bottom, then save and close:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
```

Close the terminal completely and open a new one. Then:

```bash
nvm install --lts
nvm use --lts
nvm alias default lts/*
node -v
npm -v
```

`node -v` should print `v22.x.x` or higher.

`npm` came with Node. It is the tool that downloads code libraries other
people wrote.

**LTS** means Long Term Support — the version that gets bug fixes for
years. Always pick LTS for real work.

## A3. Install Git

macOS usually has Git already. Check with `git --version`. If it is
missing:

```bash
brew install git
```

Then tell Git who you are. This name and email go into every commit.

```bash
git config --global user.name "Santhoshkumar"
git config --global user.email "santhoshkumars1903@gmail.com"
git config --global init.defaultBranch main
```

## A4. Install MongoDB on your machine

Two commands. The first tells Homebrew where MongoDB lives, the second
installs it.

```bash
brew tap mongodb/brew
brew install mongodb-community@8.0
```

Now start it. This makes MongoDB run quietly in the background and start
again automatically when you restart your Mac.

```bash
brew services start mongodb-community@8.0
```

Check it is running:

```bash
brew services list
```

You should see `mongodb-community` with the word `started` next to it.

To stop it later: `brew services stop mongodb-community@8.0`.

## A5. Install mongosh and Compass

```bash
brew install mongosh
brew install --cask mongodb-compass
```

Now prove the database really works:

```bash
mongosh
```

You should get a prompt that looks like `test>`. Type these lines:

```javascript
db.smoke.insertOne({ hello: "world" })
db.smoke.find()
db.smoke.drop()
exit
```

If you saw your `{ hello: "world" }` come back, the database is working.
That last line deleted the test data again.

## A6. Install VS Code

```bash
brew install --cask visual-studio-code
```

Open VS Code once. Then press `Cmd+Shift+P`, type `shell command`, and
pick **Install 'code' command in PATH**. Now `code .` opens the current
folder from your terminal.

Jump to **Part C**.

---

# Part B — Windows

## B1. Install Node.js

Open PowerShell **as Administrator** (right-click, Run as administrator).

```powershell
winget install OpenJS.NodeJS.LTS
```

Close PowerShell, open a new one, then:

```powershell
node -v
npm -v
```

If you want a Node version switcher later, install `nvm-windows` from
GitHub. It is optional and you can skip it for now.

## B2. Install Git

```powershell
winget install Git.Git
```

Then:

```powershell
git config --global user.name "Santhoshkumar"
git config --global user.email "santhoshkumars1903@gmail.com"
git config --global init.defaultBranch main
```

## B3. Install MongoDB

Download the installer from
`https://www.mongodb.com/try/download/community`. Pick **Windows**,
package **msi**, and run it.

During install:

- Choose **Complete** setup
- Leave **Install MongoDB as a Service** ticked — this means it starts by
  itself every time Windows starts
- Tick **Install MongoDB Compass** as well

## B4. Install mongosh

Download from `https://www.mongodb.com/try/download/shell`, run the
installer, then open a new PowerShell and run:

```powershell
mongosh
```

Test it the same way as the Mac steps above (A5).

## B5. Install VS Code

```powershell
winget install Microsoft.VisualStudioCode
```

---

# Part C — Everyone

## C1. VS Code extensions

Extensions are small add-ons for the editor. Install these five:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension mongodb.mongodb-vscode
code --install-extension anthropic.claude-code
```

What each one does, in one line:

- **ESLint** — underlines code that breaks your project's rules
- **Prettier** — reformats your code neatly when you save
- **Tailwind CSS** — suggests style class names as you type
- **MongoDB** — lets you browse the database inside the editor
- **Claude Code** — the AI helper, inside VS Code

## C2. Install Claude Code in the terminal

```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

`-g` means global — install it once for your whole machine, not just one
project.

## C3. Final check — run all of these

```bash
node -v          # v22 or higher
npm -v           # 10 or higher
git --version    # 2.x
mongosh --version
code -v
claude --version
```

If all six print a version, your machine is ready.

## C4. One last real test

This creates a throwaway folder, connects to the database from Node, and
deletes itself. It proves Node and MongoDB can actually talk to each
other — which is the only thing that matters.

```bash
mkdir ~/smoke-test && cd ~/smoke-test
npm init -y
npm install mongodb
```

Create a file called `test.js`:

```javascript
const { MongoClient } = require("mongodb");

async function main() {
  const client = new MongoClient("mongodb://127.0.0.1:27017");
  await client.connect();
  const result = await client.db("smoke").collection("t").insertOne({ ok: true });
  console.log("Wrote document with id:", result.insertedId);
  await client.db("smoke").dropDatabase();
  await client.close();
}

main();
```

Run it:

```bash
node test.js
```

You should see `Wrote document with id: <some long id>`.

Then clean up:

```bash
cd ~ && rm -rf ~/smoke-test
```

`27017` is the door number (called a **port**) that MongoDB listens on by
default. You will see it again in your project settings.

---

## Common problems

**`command not found` right after installing something**
Your terminal loaded its settings before the tool existed. Close the
terminal window completely and open a new one.

**`brew: command not found` on a new Mac**
You skipped the `eval "$(/opt/homebrew/bin/brew shellenv)"` lines that
Homebrew printed. Run them, then add them to `~/.zshrc`.

**`MongoServerError: connection refused` or `ECONNREFUSED 27017`**
The database is not running. On Mac:
`brew services start mongodb-community@8.0`. On Windows: open the
Services app, find MongoDB, click Start.

**`EACCES: permission denied` when running `npm install -g`**
You installed Node without nvm and it landed in a protected folder. Do
not fix this with `sudo`. Install nvm (step A2) and reinstall Node
through it.

**Port 27017 already in use**
Another MongoDB is already running. That is fine — use it, do not start
a second one.

---

## What you have now

A machine that can run a JavaScript server, store data in a database on
your own disk, track changes to your code, and let an AI helper edit
files for you.

Next: read `01-ARCHITECTURE.md` to see the shape of the project, then
`02-PRODUCT-PLAN.md` to start building V0.
