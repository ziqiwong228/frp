import "./style.css";
import { interval, fromEvent, merge} from "rxjs";
import { map, filter, scan} from "rxjs/operators";

function main() {
  /**
   * Inside this function you will use the classes and functions from rx.js
   * to add visuals to the svg element in pong.html, animate them, and make them interactive.
   *
   * Study and complete the tasks in observable examples first to get ideas.
   *
   * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
   *
   * You will be marked on your functional programming style
   * as well as the functionality that you implement.
   *
   * Document your code!
   */

  /**
   * This is the view for your game to add and update your game elements.
   */

  const 
    Constants = {
      SVG: document.querySelector("#svgCanvas") as SVGElement & HTMLElement,
      CANVAS_SIZE: {
        width: 600,
        height: 800,
        height_obstacle: 260,
        height_exit:190,
        river_pos_y1:150,
        river_pos_y2:440,
      },
      START_TRUCK1_COUNT: 1,
      START_TRUCK2_COUNT: 1,
      START_CAR1_COUNT: 2,
      START_CAR2_COUNT: 3,
      START_PLANK1_COUNT: 1,
      START_PLANK2_COUNT: 3,
      START_PLANK3_COUNT: 3,
      START_TURTLE1_COUNT: 4,
      START_TURTLE2_COUNT: 4,
      START_TIME: 0,
      EXIT_COUNT: 4

    } as const

  type Key = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'
  type Event = 'keydown' | 'click'

  // view elements types
  type ViewType = 'frog' | 'car1' | 'car2' | 'truck1' | 'truck2' | 'plank1' | 'plank2' | 'plank3' |
                  'turtle1' | 'turtle2' | 'exit' 

  // game state transitions
  class Tick { constructor(public readonly elapsed:number) {} }
  class Move { constructor(public readonly x_direction: number, public readonly y_direction: number){} }

  const  
    gameClock = interval(10)
    .pipe(map(elapsed=>new Tick(elapsed))),

    // !repeat churn out continuous keydown events
    keyObservable = <T>(e:Event, k:Key, result:()=>T)=>
        fromEvent<KeyboardEvent>(document,e)
          .pipe(
            filter(({code})=>code === k),
            filter(({repeat})=>!repeat),
            map(result)),

    startLeftMove = keyObservable('keydown','ArrowLeft',()=>new Move(-40, 0)),
    startRightMove = keyObservable('keydown','ArrowRight',()=>new Move(40, 0)),
    startUpMove = keyObservable('keydown','ArrowUp',()=>new Move(0, -40)),
    startDownMove = keyObservable('keydown','ArrowDown',()=>new Move(0, 40))

  type Rect = Readonly<{pos: Vec, width:number, height:number}>
  type ObjectId = Readonly<{id:string,createTime:number}>

  interface IBody extends ObjectId {
    viewType: ViewType,
    pos:Vec,
    vel:Vec,
    acc:Vec,
    radius:number,
    score:number,
  }

  interface IRectBody extends Rect, ObjectId {
    viewType: ViewType,
    vel:Vec,
    acc:Vec,
    isOccupied:boolean
  }

  type FrogBody = Readonly<IBody>

  // every objects are that participate are rectangle
  type RectBody = Readonly<IRectBody>

  // game state
  type State = Readonly<{
    time:number,
    frog:FrogBody,
    trucks1:ReadonlyArray<RectBody>,
    trucks2:ReadonlyArray<RectBody>,
    cars1:ReadonlyArray<RectBody>,
    cars2:ReadonlyArray<RectBody>,
    plank1:ReadonlyArray<RectBody>,
    plank2:ReadonlyArray<RectBody>,
    plank3:ReadonlyArray<RectBody>,
    turtle1:ReadonlyArray<RectBody>,
    turtle2:ReadonlyArray<RectBody>,
    objCount:number,
    gameOver:boolean,
    exits:ReadonlyArray<RectBody>,
    gameWin:boolean
  }>

  const createExit = (viewType: ViewType) =>
  (rect: Rect) => (occupied:boolean) => <Rect> {
    ...rect,
    viewType:viewType,
    isOccupied:occupied
  },

  // store the created exits in arr
  exitsArr = [createExit('exit')({pos:new Vec(30,190),width:60,height:40})(false)]
             .concat(createExit('exit')({pos:new Vec(190,190),width:60,height:40})(false))
             .concat(createExit('exit')({pos:new Vec(350,190),width:60,height:40})(false))
             .concat(createExit('exit')({pos:new Vec(510,190),width:60,height:40})(false))


  function createFrog():FrogBody {
    return {
      id: 'frog',
      viewType: 'frog',
      pos: new Vec(300,780),
      vel: Vec.Zero,
      acc: Vec.Zero,
      radius: 10,
      score: 0,
      createTime: 0
    }
  }

  const

  createRect = (viewType: ViewType) => (oid: ObjectId) => 
  (rect: Rect) => (vel: Vec) => 
  <RectBody>{
    ...oid,
    ...rect,
    vel:vel,
    acc:Vec.Zero,
    id:viewType+oid.id,
    viewType:viewType
  },
  createTruck1 = createRect('truck1'),
  createCar1 = createRect('car1'),
  createCar2 = createRect('car2'),
  createTruck2 = createRect('truck2'),
  createPlank1 = createRect('plank1'),
  createPlank2 = createRect('plank2'),
  createPlank3 = createRect('plank3'),
  createTurtle1 = createRect('turtle1'),
  createTurtle2 = createRect('turtle2')

  const

  // Pure Math.random() is used (see helper functions)
  // Initialize all trucks directions of one row,
  // speed and direction are defined in Vec(n,n),
  // initialize all trucks of one row based on their directions

  initialTrucks1Directions = [...Array(Constants.START_TRUCK1_COUNT)]
    .map(()=>new Vec(1, 0)),

  startTrucks1 = [...Array(Constants.START_TRUCK1_COUNT)]
    .map((_,i)=>createTruck1({id:String(i),createTime:Constants.START_TIME})
    ({pos:new Vec(Math.random()*600, 500), width:100, height:40})
    (initialTrucks1Directions[i])),

  initialCars1Directions = [...Array(Constants.START_CAR1_COUNT)]
    .map(()=>new Vec(-0.5, 0)),

  startCars1 = [...Array(Constants.START_CAR1_COUNT)]
    .map((_,i)=>createCar1({id:String(i),createTime:Constants.START_TIME})
    ({pos:new Vec(Math.random()*600, 570), width:60, height:40})
    (initialCars1Directions[i])),

  initialCars2Directions = [...Array(Constants.START_CAR2_COUNT)]
    .map(()=>new Vec(1, 0)),

  startCars2 = [...Array(Constants.START_CAR2_COUNT)]
    .map((_,i)=>createCar2({id:String(i),createTime:Constants.START_TIME})
    ({pos:new Vec(Math.random()*600, 630), width:50, height:40})
    (initialCars2Directions[i])),
  
  initialTrucks2Directions = [...Array(Constants.START_TRUCK2_COUNT)]
    .map(()=>new Vec(-1, 0)),

  startTrucks2 = [...Array(Constants.START_TRUCK2_COUNT)]
    .map((_,i)=>createTruck2({id:String(i),createTime:Constants.START_TIME})
    ({pos:new Vec(Math.random()*600, 700), width:100, height:40})
    (initialTrucks2Directions[i])),
  
  initialPlanks1Directions = [...Array(Constants.START_PLANK1_COUNT)]
    .map(()=>new Vec(-1, 0)),

  startPlanks1 = [...Array(Constants.START_PLANK1_COUNT)]
    .map((_,i)=>createPlank1({id:String(i),createTime:Constants.START_TIME})
    ({pos:new Vec(Math.random()*600, 240), width:200, height:40})
    (initialPlanks1Directions[i])),
  
  initialPlanks2Directions = [...Array(Constants.START_PLANK2_COUNT)]
    .map(()=>new Vec(0.5, 0)),

  startPlanks2 = [...Array(Constants.START_PLANK2_COUNT)]
    .map((_,i)=>createPlank2({id:String(i),createTime:Constants.START_TIME})
    ({pos:new Vec(Math.random()*600, 290), width:150, height:25})
    (initialPlanks2Directions[i])),

  initialPlanks3Directions = [...Array(Constants.START_PLANK3_COUNT)]
    .map(()=>new Vec(-0.5, 0)),

  startPlanks3 = [...Array(Constants.START_PLANK3_COUNT)]
    .map((_,i)=>createPlank3({id:String(i),createTime:Constants.START_TIME})
    ({pos:new Vec(Math.random()*600, 360), width:100, height:40})
    (initialPlanks3Directions[i])),
  
  initialTurtles1Directions = [...Array(Constants.START_TURTLE1_COUNT)]
    .map(()=>new Vec(0.5, 0)),
  
  startTurtles1 = [...Array(Constants.START_TURTLE1_COUNT)]
    .map((_,i)=>createTurtle1({id:String(i),createTime:Constants.START_TIME})
    ({pos:new Vec(Math.random()*600, 408), width:35, height:25})
    (initialTurtles1Directions[i])),
  
  initialTurtles2Directions = [...Array(Constants.START_TURTLE2_COUNT)]
    .map(()=>new Vec(0.25, 0)),
  
  startTurtles2 = [...Array(Constants.START_TURTLE2_COUNT)]
    .map((_,i)=>createTurtle2({id:String(i),createTime:Constants.START_TIME})
    ({pos:new Vec(Math.random()*600, 328), width:35, height:25})
    (initialTurtles2Directions[i])),

  initialState:State = {
    time:0,
    frog:createFrog(),
    trucks1:startTrucks1,
    trucks2:startTrucks2,
    cars1:startCars1,
    cars2:startCars2,
    plank1:startPlanks1,
    plank2:startPlanks2,
    plank3:startPlanks3,
    turtle1:startTurtles1,
    turtle2:startTurtles2,
    objCount:0,
    gameOver:false,
    exits:[],
    gameWin:false
  },

  // wrap a positions around edges of the screen
  torusWrap = (o:RectBody,{x,y}:Vec) => { 
    const s=Constants.CANVAS_SIZE.width, 
      wrap = (v:number) => v+o.width < 0 ? v+o.width + s : v > s ? v-o.width - s : v
    return new Vec(wrap(x),y)
  },

  // rect movements
  moveRectBody = (o: RectBody) => <RectBody> {
    ...o, 
    pos:torusWrap(o,o.pos.add(o.vel)),
    vel:o.vel.add(o.acc)
  },

  // frog movement when colliding with rects in river
  moveFrog = (o: FrogBody) => <FrogBody> {
    ...o, 
    pos:o.pos.add(o.vel),
    vel:o.vel.add(o.acc)
  },

  // occupyExit = (o:Rect) => <RectBody> {
  //   ...o,
  //   isOccupied: true
  // },

  // restrict frog from moving to obstacles
  obstacleCond = (o:FrogBody,x:number,y:number) => {
    return (o.pos.y+y)<Constants.CANVAS_SIZE.height_obstacle && 
    ((o.pos.x+x>=0 && o.pos.x+x<=30) || 
    (o.pos.x+x>=90 && o.pos.x+x<=190) ||
    (o.pos.x+x>=250&&o.pos.x+x<=350) ||
    (o.pos.x+x>=410 && o.pos.x+x<=510) ||
    (o.pos.x+x>=570 && o.pos.x+x<=670))
  },

  // exitCond = (o:FrogBody,y:number,s:State) =>
  //   s.exits.filter((r)=>r.isOccupied).some(r=> o.pos.y+y<=r.pos.y+r.height),

  // frog movements by user
  moveFrogByKey = (o: FrogBody, {x,y}:Vec, s: State) => { 
    const size=Constants.CANVAS_SIZE, 
      // frog has radius 10, and space takes 10 so add or subtract 20 to width and height
      wrapX = (x:number) => (o.pos.x+x) < 0 ? 20 : (o.pos.x+x) > size.width ? size.width-20 : o.pos.x+x,
      wrapY = (y:number) => obstacleCond(o,x,y)? 
                            size.height_obstacle : (o.pos.y+y) > size.height ? 
                            size.height-20 : o.pos.y+y
    return new Vec(wrapX(x),wrapY(y))
  },

  // check a State for collisions:
  // frog colliding with river or cars ends game
  // frog colliding with rect in river initiates movements
  handleCollisions = (s:State) => {
    const

      // check if frog collides with ground bodies
      groundBodiesCollided = ([a,b]:[FrogBody,RectBody]) => 
        a.pos.scaleX(b.pos, b.width)>(b.width/2+a.radius) ||
        a.pos.scaleY(b.pos, b.height)>(b.height/2+a.radius) ? false:
        a.pos.scaleX(b.pos, b.width)<=(b.width/2) ||
        a.pos.scaleY(b.pos, b.height)<=(b.height/2) ? true: false,

      frogCollidedRectGround = (s.trucks1.filter(r=>groundBodiesCollided([s.frog,r])).length > 0 ||
                               s.trucks2.filter(r=>groundBodiesCollided([s.frog,r])).length > 0 ||
                               s.cars1.filter(r=>groundBodiesCollided([s.frog,r])).length > 0 ||
                               s.cars2.filter(r=>groundBodiesCollided([s.frog,r])).length > 0),

      // check if frog collides with river bodies
      riverBodiesCollided = ([a,b]:[FrogBody,RectBody|Rect]) => 
        (a.pos.x >= (b.pos.x+a.radius) && a.pos.x <= (b.pos.x+b.width-a.radius)) &&
        (a.pos.y >= (b.pos.y+a.radius) && a.pos.y <= (b.pos.y+b.height-a.radius)) ? true : false,

      // multiple river bodies in one row, so use some to check if any of it collides with frog,
      // if collision occurs, get its velocity,
      // destruct the array to get the first element (velocity is the same for all bodies in one row)
      [frogCollidedRectRiverVel] = s.plank1.some(r=>riverBodiesCollided([s.frog,r])) ? 
                                   s.plank1.filter(r=>riverBodiesCollided([s.frog,r])).map(r => r.vel) :
                                   s.plank2.some(r=>riverBodiesCollided([s.frog,r])) ?
                                   s.plank2.filter(r=>riverBodiesCollided([s.frog,r])).map(r => r.vel) :
                                   s.plank3.some(r=>riverBodiesCollided([s.frog,r])) ? 
                                   s.plank3.filter(r=>riverBodiesCollided([s.frog,r])).map(r => r.vel) :
                                   s.turtle1.some(r=>riverBodiesCollided([s.frog,r])) ? 
                                   s.turtle1.filter(r=>riverBodiesCollided([s.frog,r])).map(r => r.vel) :
                                   s.turtle2.some(r=>riverBodiesCollided([s.frog,r])) ? 
                                   s.turtle2.filter(r=>riverBodiesCollided([s.frog,r])).map(r => r.vel) :
                                   [Vec.Zero],

      // check if frog is in river
      frogInRiver = s.frog.pos.y>=Constants.CANVAS_SIZE.river_pos_y1 && s.frog.pos.y<=Constants.CANVAS_SIZE.river_pos_y2,

      // check if frog collides with river bodies
      frogCollidedRectRiver = frogInRiver &&
                             (s.plank1.filter(r=>riverBodiesCollided([s.frog,r])).length > 0 ||
                              s.plank2.filter(r=>riverBodiesCollided([s.frog,r])).length > 0 || 
                              s.plank3.filter(r=>riverBodiesCollided([s.frog,r])).length > 0 ||
                              s.turtle1.filter(r=>riverBodiesCollided([s.frog,r])).length > 0 ||
                              s.turtle2.filter(r=>riverBodiesCollided([s.frog,r])).length > 0),

      // check if frog collides with river
      frogCollidedRiver = frogInRiver && 
                          (s.plank1.filter(r=>riverBodiesCollided([s.frog,r])).length <= 0 &&
                          s.plank2.filter(r=>riverBodiesCollided([s.frog,r])).length <= 0 &&
                          s.plank3.filter(r=>riverBodiesCollided([s.frog,r])).length <= 0 &&
                          s.turtle1.filter(r=>riverBodiesCollided([s.frog,r])).length <= 0 &&
                          s.turtle2.filter(r=>riverBodiesCollided([s.frog,r])).length <= 0),
      
      // check if frog touches the boundary after moving along with river bodies
      frogOutOfBoundary = s.frog.pos.x < 0 || s.frog.pos.x > Constants.CANVAS_SIZE.width,

      // frogAtExitPos = exitsArr.filter(r=>riverBodiesCollided([s.frog,r])),

      // check if frog is at exit
      frogAtExit = exitsArr.some(r=>riverBodiesCollided([s.frog,r]))

    return <State>{
      ...s,
      frog: frogCollidedRectRiver ?
            {...s.frog, vel:frogCollidedRectRiverVel}
            :
            {...s.frog,vel:Vec.Zero},
      gameOver: frogCollidedRectGround || (frogCollidedRiver && !frogAtExit) || frogOutOfBoundary ,
      // exits: frogAtExit? concat(s.exits,frogAtExitPos) : [],
      gameWin: frogAtExit
    }
  },

  // all bodies move, frog will move if collides with river bodies
  tick = (s:State,elapsed:number) => {
    return handleCollisions({...s,
      frog:moveFrog(s.frog),
      trucks1:s.trucks1.map(moveRectBody),
      cars1:s.cars1.map(moveRectBody),
      cars2:s.cars2.map(moveRectBody),
      trucks2:s.trucks2.map(moveRectBody),
      plank1:s.plank1.map(moveRectBody),
      plank2:s.plank2.map(moveRectBody),
      plank3:s.plank3.map(moveRectBody),
      turtle1:s.turtle1.map(moveRectBody),
      turtle2:s.turtle2.map(moveRectBody),
      // exits:s.exits.map(occupyExit),
      time:elapsed
    })
  },

  // state transducer
  reduceState = (s:State, e:Move|Tick)=>
    e instanceof Move ? 
    // if frog is moving up and does not collide with obstacles, increase scores by 10
    e.y_direction==-40 && !obstacleCond(s.frog,e.x_direction,e.y_direction) ?
    {...s, frog:{...s.frog, pos: moveFrogByKey(s.frog, new Vec(e.x_direction, e.y_direction), s),score:s.frog.score+10}} 
    :
    // if frog is moving down, decrease scores by 10 to make the game fair (move further gets higher scores )
    e.y_direction==40 && s.frog.pos.y<=Constants.CANVAS_SIZE.height? 
    {...s, frog:{...s.frog, pos: moveFrogByKey(s.frog, new Vec(e.x_direction, e.y_direction), s),score:s.frog.score-10}} 
    :
    {...s, frog: {...s.frog, pos: moveFrogByKey(s.frog, new Vec(e.x_direction, e.y_direction), s)}}
    :
    tick(s, e.elapsed)

  // update svg scene, impure
  function updateView(s: State): void {
    const
      updateBodyView = (b:RectBody) => {
        function createBodyView() {
          const v = document.createElementNS(Constants.SVG.namespaceURI, "rect")!;
          attr(v,{id:b.id,width:b.width,height:b.height});
          v.classList.add(b.viewType)
          Constants.SVG.appendChild(v)
          return v;
        }
        // check if v has been created
        const v = document.getElementById(b.id) || createBodyView();
        attr(v,{x:b.pos.x,y:b.pos.y});
        
      },

      createFrogView = () => {
        const frog = document.createElementNS(Constants.SVG.namespaceURI, "circle")!;
        attr(frog,{id:s.frog.id,r:s.frog.radius,x:s.frog.pos.x,y:s.frog.pos.y,class:"frog"});
        frog.classList.add(s.frog.viewType)
        Constants.SVG.appendChild(frog)
        return frog
      },

      updateScoreBoard = (o:FrogBody) => {
        function createScoreView() {
          const v = document.createElementNS(Constants.SVG.namespaceURI, "text")!
          attr(v,{id:'scoreboard',x:Constants.CANVAS_SIZE.width/8,y:Constants.CANVAS_SIZE.height/10,class:"scoreboard"})
          Constants.SVG.appendChild(v)
          return v
        }
        const v = document.getElementById('scoreboard')! || createScoreView()
        v.textContent = "Score: " + o.score
      }

    updateScoreBoard(s.frog)

    s.trucks1.forEach(updateBodyView)
    s.cars1.forEach(updateBodyView)
    s.cars2.forEach(updateBodyView)
    s.trucks2.forEach(updateBodyView)
    s.plank1.forEach(updateBodyView)
    s.plank2.forEach(updateBodyView)
    s.plank3.forEach(updateBodyView)
    s.turtle1.forEach(updateBodyView)
    s.turtle2.forEach(updateBodyView)

    const frog = document.getElementById(s.frog.id) || createFrogView()
    attr(frog, {transform:`translate(${s.frog.pos.x}, ${s.frog.pos.y})`})

    s.exits.forEach(updateBodyView)

    if(s.gameOver) {
      subscription.unsubscribe()
      function createGameOverMenuView(e:String) {
        const 
          rect = document.createElementNS(Constants.SVG.namespaceURI, "rect")!,
          text = document.createElementNS(Constants.SVG.namespaceURI, "text")!,
          button = document.createElementNS(Constants.SVG.namespaceURI, "rect")!,
          buttonText = document.createElementNS(Constants.SVG.namespaceURI, "text")!
        attr(rect,{id:'gameoverRect',x:Constants.CANVAS_SIZE.width/6,y:Constants.CANVAS_SIZE.height/4,width:400,height:400,class:"gameoverRect"})
        attr(text,{id:'gameoverText',x:Constants.CANVAS_SIZE.width/3.5,y:Constants.CANVAS_SIZE.height/2.25,class:"gameoverText"})
        text.textContent = "Game Over";
        attr(button,{id:'gameoverButton',x:Constants.CANVAS_SIZE.width/2.75,y:Constants.CANVAS_SIZE.height/2,width:150,height:50,class:"gameoverButton"})
        attr(buttonText,{id:'gameoverButtonText',x:Constants.CANVAS_SIZE.width/2.4,y:Constants.CANVAS_SIZE.height/1.85,class:"gameoverButtonText"})
        buttonText.textContent = "TRY AGAIN";
        Constants.SVG.appendChild(rect);
        Constants.SVG.appendChild(text);
        Constants.SVG.appendChild(button);
        Constants.SVG.appendChild(buttonText);
        return e==="rect" ? rect : e==="text" ? text : e==="button" ? button : buttonText
      }

      const 
        rect = document.getElementById('gameoverRect') || createGameOverMenuView("rect"),
        text = document.getElementById('gameoverText') || createGameOverMenuView("text"),
        button = document.getElementById('gameoverButton') || createGameOverMenuView("button"),
        buttonText = document.getElementById('gameoverButtonText') || createGameOverMenuView("buttonText")

      attr(rect,{visibility:'visible'})
      attr(text,{visibility:'visible'})
      attr(button,{visibility:'visible'})
      attr(buttonText,{visibility:'visible'})

      // fromEvent(button,'click')
      //   .subscribe(()=> {
      //   attr(rect,{visibility:'hidden'})
      //   attr(text,{visibility:'hidden'})
      //   attr(button,{visibility:'hidden'})
      //   attr(buttonText,{visibility:'hidden'})
      //   resetGame(initialState,"gameOver")
      // })
    }

    if(s.gameWin) {
      subscription.unsubscribe()
      const
        text = document.createElementNS(Constants.SVG.namespaceURI, "text")!
      attr(text,{id:'winText',x:Constants.CANVAS_SIZE.width/3,y:Constants.CANVAS_SIZE.height/6,class:"winText"})
      text.textContent = "Congratz!";
      Constants.SVG.appendChild(text);
    }
  }

  // function reducer(s:State, action:String): State {
  //   return action=="gameOver" || action=="newGame" ? initialState :
  //          action=="nextRound" ? {...initialState,exits:s.exits} :
  //          s
  // }

  // main game stream
  const
  subscription =
    merge(gameClock, startLeftMove, startRightMove, startUpMove, startDownMove)
    .pipe(scan(reduceState,initialState)).subscribe(updateView)

  // resetGame = (s:State,action:String) => {
  //   merge(gameClock, startLeftMove, startRightMove, startUpMove, startDownMove)
  //   .pipe(scan(reduceState, reducer(s,action))).subscribe(updateView)
  // },



}


class Vec {
  constructor(public readonly x: number = 0, public readonly y: number = 0) {}
  add = (b:Vec) => new Vec(this.x + b.x, this.y + b.y)
  // sub = (b:Vec) => new Vec(this.x - b.x, this.y - b.y)
  len = ()=> (this.x*this.x + this.y*this.y)
  scaleX = (b:Vec,w:number) => Math.abs(this.x-b.x-w/2)
  scaleY = (b:Vec,h:number) => Math.abs(this.y-b.y-h/2)
  static Zero = new Vec();
}

/**
 * apply f to every element of a and return the result in a flat array
 * @param a an array
 * @param f a function that produces an array
 */
function flatMap<T,U>(
  a:ReadonlyArray<T>,
  f:(a:T)=>ReadonlyArray<U>
): ReadonlyArray<U> {
  return Array.prototype.concat(...a.map(f));
}

const 
/**
 * set a number of attributes on an Element at once
 * @param e the Element
 * @param o a property bag
 */         
  attr = (e:Element,o:{[key: string]: Object}) =>
  { for(const k in o) e.setAttribute(k,String(o[k])) },

/**
 * Composable not: invert boolean result of given function
 * @param f a function returning boolean
 * @param x the value that will be tested with f
 */
   not = <T>(f:(x:T)=>boolean)=> (x:T)=> !f(x),

/**
* is e an element of a using the eq function to test equality?
* @param eq equality test function for two Ts
* @param a an array that will be searched
* @param e an element to search a for
*/
  elem = 
    <T>(eq: (_:T)=>(_:T)=>boolean)=> 
      (a:ReadonlyArray<T>)=> 
        (e:T)=> a.findIndex(eq(e)) >= 0,

 /**
 * array a except anything in b
 * @param eq equality test function for two Ts
 * @param a array to be filtered
 * @param b array of elements to be filtered out of a
 */ 
  except = 
    <T>(eq: (_:T)=>(_:T)=>boolean)=>
      (a:ReadonlyArray<T>)=> 
        (b:ReadonlyArray<T>)=> a.filter(not(elem(eq)(b)))



Math.random = (function () {
  var seed = 88888888
  return function () {
    // Robert Jenkins' 32 bit integer hash function.
    seed = seed & 0xffffffff
    seed = (seed + 0x7ed55d16 + (seed << 12)) & 0xffffffff
    seed = (seed ^ 0xc761c23c ^ (seed >>> 19)) & 0xffffffff
    seed = (seed + 0x165667b1 + (seed << 5)) & 0xffffffff
    seed = ((seed + 0xd3a2646c) ^ (seed << 9)) & 0xffffffff
    seed = (seed + 0xfd7046c5 + (seed << 3)) & 0xffffffff
    seed = (seed ^ 0xb55a4f09 ^ (seed >>> 16)) & 0xffffffff
    return (seed & 0xfffffff) / 0x10000000
  }
})()


// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
    };
}
