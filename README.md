# Foosbot

A bot for keeping scores of foosball games.

## TODO

- [x] Add a way to add players
- [x] Add a way to add games
- [ ] Add a way to see the leaderboard
- [ ] Add a way to see the history of games
- [ ] Add a way to see the history of a player
- [ ] Add a way to autogenerate app.manifest
  - Collect actions from the code
  - Generate the manifest
    - Maybe have a manifest object exported by each handler that can be collected on build
  - Generate with url / available on endpoint
    - Can maybe be done automatically
- [x] Handle other paths than /slack with @cloudflare/itty-router-openapi
- [ ] Generate graphs with the leaderboard
- [x] Import history from channel
- [ ] Generate links correct links to worker
- [ ] Add help
  - Check if message is in a channel we subscribe to and display help if the message starts with ! 

- thumbnails 
  - base64 encode and have a route that transform it into an image?
  - use d3 to help drawing the svg without generating a node?
  - return chart on endpoint thumbnail then queries the endpoint at picks the svgs converts it to img and gives that as an url
  - 

###

- Glicko2:
  https://github.com/mmai/glicko2js
- ELO:
  https://github.com/hoersamu/multi-elo
- TrueSkill:
  https://github.com/scttcper/ts-trueskill
  https://github.com/philihp/openskill.js
