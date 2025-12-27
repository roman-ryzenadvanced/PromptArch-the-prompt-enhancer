#!/bin/bash
game_path="/hosting/rommark.dev/public/tools/game/index.html"
sudo sed -i 's|github.com/roman-ryzenadvanced/chrismas_trae_game|github.rommark.dev/admin/chrismas_trae_game|g' "$game_path"
back_link='<a href="/tools/" style="position:fixed;top:20px;left:20px;z-index:9999;background:rgba(255,255,255,0.2);backdrop-filter:blur(10px);color:white;text-decoration:none;padding:10px 20px;border-radius:20px;border:1px solid rgba(255,255,255,0.3);">← Back</a>'
# Only add if not already there
if ! grep -q "← Back" "$game_path"; then
  sudo sed -i "s|<body>|<body>$back_link|g" "$game_path"
fi
