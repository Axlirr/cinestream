[![Downloads@latest](https://img.shields.io/github/downloads/Axlirr/cinestream/latest/total?style=for-the-badge)](https://github.com/Axlirr/cinestream/releases/latest/)
[![Release Version Badge](https://img.shields.io/github/v/release/Axlirr/cinestream?style=for-the-badge)](https://github.com/Axlirr/cinestream/releases)

# CineStream
A cross-platform Electron Desktop App to stream and download any Movie, TV Series or Anime in the World. Zero Ads and Tracking <br></br>
<img src="public/logo.png" width="150" alt="Logo">

## 🙏 Credits & Acknowledgements
**CineStream** is a hard-fork and continuation of the original **[Streambert](https://github.com/truelockmc/streambert)** project created by **[truelockmc](https://github.com/truelockmc)**. Full credit goes to the original author for the incredible foundation. 
This fork maintains the original GPL-3.0 License.

## ✨ What's New in CineStream?
CineStream improves upon the original foundation with a completely rewritten, anti-bot resistant download engine:

| Feature | Streambert (Original) | CineStream (This Fork) |
|---|---|---|
| **Download Engine** | Uses broken pre-compiled wrapper, crashes on Cloudflare | Dual-engine: direct yt-dlp with Chrome impersonation, falls back to wrapper |
| **Anti-Bot Bypass** | None — gets 403 Forbidden | `curl-cffi` Chrome TLS fingerprint impersonation |
| **Video Format** | Saves raw `.ts` stream as `.mp4` → blank/unplayable videos | Proper MP4 container via `--merge-output-format mp4` |
| **CDN Authentication** | No Referer headers sent → download rejected | Smart per-source Referer/Origin injection (Videasy, VidSrc) |
| **Default Theme** | Netflix Red | Modern Cyan/Teal |

## Features
- 🎦 **Streaming:** Stream any Movie, Anime or TV Series from around the World.
- 📥 **Downloading:** Advanced Cloudflare-bypassing download engine.
- 🍿 **Watch Parties:** Host watch parties to stream perfectly in sync with your friends.
- 🎭 **Cast & Actor Info:** Explore full cast lists, actor biographies, and filmographies directly in the app.
- 📃 **Subtitles:** Download and manage Subtitles.
- ⚙️ **Customizability:** Customize the Interface and Features to your unique needs.
- 📚 **Library:** Track what you watched, save stuff you want to watch and manage your Downloads.
- 🛡️ **Privacy:** Completely Ads and Tracker free, forever.

## Requirements
- [Node.js](https://nodejs.org/) (>=22.12.0) installed (if building from source)
- A free TMDB API Read Access Token ([Guide on how to get one](tmdb-tutorial.md))
- For downloading: **Python 3**, **pip**, and **ffmpeg** must be installed on your system.
  - Install dependencies: `pip install yt-dlp[default] curl-cffi`

## Installation
On first launch you'll be prompted to enter your TMDB API key. ([Guide on how to get one](tmdb-tutorial.md))

### Windows
Download the latest `CineStream Setup *.exe` from the [Releases](https://github.com/Axlirr/cinestream/releases/latest) page and run it.

### Linux (.deb / .AppImage / .pacman)
Download the latest linux release from the [Releases](https://github.com/Axlirr/cinestream/releases/latest) page.

## Legal Disclaimer
**IMPORTANT: This application is for educational and personal use only.**
- CineStream does not host, store, or distribute any copyrighted content
- All content is sourced from third-party providers and websites
- Users are solely responsible for ensuring they have legal rights to access any content
- The developer does not endorse or encourage copyright infringement
- No copyrighted material is stored on our side
