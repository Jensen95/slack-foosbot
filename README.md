# Foosbot

A bot for keeping scores of foosball games.

## TODO

- [ ] Add a way to add players
- [ ] Add a way to add games
- [ ] Add a way to see the leaderboard
- [ ] Add a way to see the history of games
- [ ] Add a way to see the history of a player
- [ ] Add a way to autogenerate app.manifest
  - Collect actions from the code
  - Generate the manifest
    - Maybe have a manifest object exported by each handler that can be collected on build
  - Generate with url / available on endpoint
    - Can maybe be done automatically
- [ ] Handle other paths than /slack with @cloudflare/itty-router-openapi
- [ ] Generate graphs with the leaderboard
- [ ] Import history from channel
