### Wish list
- player
  - Specific movement to be define
  - animation
- Dynamic level
  - Meaning we can load a level dynamicly
- Player oriented game
  - this mean the all game is only reacting to the player, never the other way arround. There for, the only "real" actor in the game is the player and only the player
- Tile data system
  - In nutshel, it's like the block NBD data system of minercaft.
  - Why ?
    - To made possible "active" level object without the need of a real actor system or a ECS


### TODO
- [X] : Collision SAT
  - [X] : MTV
  - [x] : basic SAT
  - [x] mini optimization

- [ ] Render
  - [ ] WebGL (i guess, in reallity, i dont think i can poll it off without the need of a crunch, so for the first time in my life, i am ... not doing the dumd but coolest things and chose the mid but chill things...)
  - *[x] tile render basic
  - *[x] baic camera
  - *[x] basic background
  - [x] a Good auto tiling
    - [x] Pre compute of tiling
  - [ ] custom background
  - [ ] paralax background
  - [ ] pre-renderin of sprite
  - [x] pixelated render
  - [x] shadow like
  - [ ] basic ass particule for jump, death and more
  - [x] UI lmao
  - [x] Pre-compute auto-tilling

- [ ] Camera
  - [ ] Camera smooting
  - [ ] Camera level lock (the camera dont go outside of the level)

- [ ] Tile system
  - [x] Tile collision
  - [x] Tile manager
  - [x] Tile generation
  - [ ] Tile update
  - [ ] Tile active collision
  - [ ] Tile post-process function

- [ ] Player
  - [x] Basic movment
  - [x] gravity
  - [x] buffer system
  - [x] croutch
  - [ ] respawn
  - [ ] friction
  - [x] jump correction
  - [x] coyotie time
  - [x] action movment
    - [X] IDK, need to figure that out lmao
    - [x] simple roll dash
    - [x] heavy roll dash
    - [x] velocity re-direction
  - [ ] Effect
    - In nutshel, it's a way to modify the player dynamicly with a call back system, a effect can have multiple callback which will be called by the player in time, thoses callback can be use to alter the player behaviure like, change the jump, make it teleport or dash on action or even preventing the jump
    - [ ] jump callback
    - [ ] action callback
    - [ ] update callback
    - [ ] death callback
    - [ ] prevent jump
    - [ ] prevent move
    - [ ] prevent action
    - [ ] clear callback
    - [ ] set-up callback

- [ ] Builder Grid render help
  - [ ] Grid mark
  - [ ] Grid over effect
  - [ ] Place effect
  - [ ]