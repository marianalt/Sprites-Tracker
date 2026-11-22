# Useful inspiration
- https://www.ign.com/wikis/fortnite/Sprites_Checklist_and_Guide:_All_Variants,_Abilities,_and_Extraction_Tips
- https://fortnite-sprites.com/#sprites
- https://code.visualstudio.com/docs/debugtest/port-forwarding

# Running it
The page loads `sprites.yml` with `fetch`, so open it through a web server rather than double-clicking `index.html`, e.g. `npx serve .` or VS Code's Live Server.

# Adding new sprites or variants
1. Put the images in `images/` using the naming pattern: `<sprite>.png` for Classic, `<variant>_<sprite>.png` for the rest (e.g. `holofoil_water.png`).
2. Add the sprite (or the new variant name) to `sprites.yml`. Image paths are worked out automatically; see the comment at the top of that file.
3. Run `node tools/check-sprites.mjs` to confirm every variant has an image and no image was left out.

Don't rename an existing sprite `id` - saved progress is keyed on it.

# Export and compare
- **Export CSV** (top bar) downloads your progress (`player, season, sprite, variant, status, id`). It opens in Excel or Google Sheets.
- **Compare with friend** (top bar) loads a friend's exported CSV. On wide screens the page splits in half: *"<friend> has"* on the left (they found or mastered it, you don't have it or only found it) and *"You have"* on the right (the reverse). On phones you switch between the two with a toggle. A second filter replaces the progress line: *All different* (default) shows sprites where one of you is ahead, *Mastered only* keeps just the ones one of you has mastered and the other hasn't, and *All* shows every sprite in one grid with your friend's status on each card. Each card shows the friend's status. Press × to stop comparing.
- Rows are matched on the `id` column, so don't edit it.
