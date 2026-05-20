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
**[ x ]** = done
[ _ ] = not done
**[ ^ ]** = parcialy done
**[ ? ]** = not imperative and will only be done if time allow
____


- **[ x ]** : Collision SAT
  - **[ x ]** : MTV
  - **[ x ]** : basic SAT
  - **[ x ]** mini optimization

- [ _ ] Render
  - **[ ? ]** WebGL
  *( i guess, in reallity, i dont think i can poll it off without the need of a crunch, so for the first time in my life, i am ... not doing the dumd but coolest things and chose the mid but chill things... )*
  - **[ x ]** tile render basic
  - **[ x ]** baic camera
  - **[ x ]** basic background
  - **[ x ]** a Good auto tiling
    - **[ x ]** Pre compute of tiling
  - [ _ ] custom background
  - **[ ? ]** paralax background
  - [ _ ] pre-rendering of sprite
  - **[ x ]** pixelated render
  - **[ x ]** shadow like
  - [ _ ] basic ass particule for jump, death and more
  - **[ x ]** UI lmao
  - [ _ ] Screen shake
  - [ _ ] transition

- [ _ ] Camera
  - **[ x ]** Camera smooting
  - **[ ^ ]** Camera level lock
  *( the camera dont go outside of the level )*
    - **[ x ]** Camera World limit lock
    - [ _ ] Real Camera level lock
  - **[ x ]** Camera offset
  - **[ x ]** Camera multi target
  - **[ ? ]** Camera trigger
  *( camera trigger point on the level which will be use change camera offset and target (will surly not implement but just in case ) )*
    - [ _ ] Offset trigger
    - [ _ ] target trigger
    - [ _ ] Camera offset base on player direction

- [ _ ] Tile system
  - **[ x ]** Tile collision
  - **[ x ]** Tile manager
  - **[ x ]** Tile generation
  - **[ x ]** Tile update
  - **[ x ]** Tile active collision
  - **[ x ]** Tile post-process function
  - [ _ ] Tile reset

- [ _ ] Player
  - **[ x ]** Basic movment
  - **[ x ]** gravity
  - **[ x ]** buffer system
  - **[ x ]** croutch
  - [ _ ] respawn
  - [ _ ] friction
  - [ _ ] find a new movement mecanic
    *( The actual movement mecanic is not realy good in my opion, i thinks we need to change it )*
  - **[ x ]** jump correction
  - **[ x ]** coyotie time
  - **[ x ]** action movment
    - **[ x ]** IDK, need to figure that out lmao
    - **[ x ]** simple roll dash
    - **[ x ]** heavy roll dash
    - **[ x ]** velocity re-direction
  - [ _ ] Effect
  *( In nutshel, it's a way to modify the player dynamicly with a call back system, a effect can have multiple callback which will be called by the player in time, thoses callback can be use to alter the player behaviure like, change the jump, make it teleport or dash on action or even preventing the jump )*
    - [ _ ] jump callback
    - [ _ ] action callback
    - [ _ ] update callback
    - [ _ ] death callback
    - [ _ ] prevent jump
    - [ _ ] prevent move
    - [ _ ] prevent action
    - [ _ ] clear callback
    - [ _ ] set-up callback

- [ _ ] Builder Grid render help
  - [ _ ] Grid mark
  - [ _ ] Grid over effect
  - [ _ ] Place effect

- [ _ ] Level Object
  - [ _ ] check point
  - [ _ ] spawn point
  - [ _ ] spike
  - [ _ ] trigger spike
  - [ _ ] jump pad
  - [ _ ] one way platform