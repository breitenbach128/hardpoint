/*
 * astar-for-entities
 * https://github.com/hurik/impact-astar-for-entities
 *
 * v1.0.0
 *
 * Andreas Giemza
 * andreas@giemza.net
 * http://www.hurik.de/
 *
 * This work is licensed under the Creative Commons Attribution 3.0 Unported License. To view a copy of this license, visit http://creativecommons.org/licenses/by/3.0/.
 *
 * Thanks to: Joncom and FabienM (http://impactjs.com/forums/code/a-path-finder)
 *
 * Based on : https://gist.github.com/994534
 *            http://www.policyalmanac.org/games/aStarTutorial_de.html
 *            http://theory.stanford.edu/~amitp/GameProgramming/index.html
 */

ig.module(
	'plugins.astar-for-entities'
)
.requires(
	'impact.entity'
).
defines(function() {

ig.Entity.inject({
	path: null,
	headingDirection: 0,
	lastbox2dtile: {x1:0,y1:0,x2:0,y2:0},
	// Heading direction values
	// 1 4 6
	// 2 0 7
	// 3 5 8
	
	getPath: function(destinationX, destinationY, diagonalMovement, entityTypesArray, ignoreEntityArray) {
		if(diagonalMovement == null) {
			diagonalMovement = true;
		}

		if (entityTypesArray == null) {
			entityTypesArray = [];
		}
		
		if (ignoreEntityArray == null) {
			ignoreEntityArray = [];
		}
		
	    // Get the map information  - If an "ai" layer exists, use that layer. Otherwise, use the normal collision map.
		if (ig.game.aiMap == null) {
		    var mapWidth = ig.game.collisionMap.width,
                mapHeight = ig.game.collisionMap.height,
                mapTilesize = ig.game.collisionMap.tilesize,
                map = ig.game.collisionMap.data;
		} else {
		    var mapWidth = ig.game.aiMap.width,
                mapHeight = ig.game.aiMap.height,
                mapTilesize = ig.game.aiMap.tilesize,
                map = ig.game.aiMap.data;
		}
			// Direction change maluses
		var	directionChangeMalus45degree = 2,
			directionChangeMalus90degree = 5,
			// Diagonal movement costs
			diagonalMovementCosts = Math.sqrt(2);

		this.getPathAddEraseEntities(true, entityTypesArray, ignoreEntityArray);

		// Create the start and the destination as nodes
		var startNode = new asfeNode((this.pos.x / mapTilesize).floor(), (this.pos.y / mapTilesize).floor(), -1, 0),
			destinationNode = new asfeNode((destinationX / mapTilesize).floor(), (destinationY / mapTilesize).floor(), -1, 0);

		// Check if the destination tile is not the start tile ...
		if(destinationNode.x == startNode.x && destinationNode.y == startNode.y) {
			this.path = null;
			return;
		}

		// Add the entities to the collision map
		this.getPathAddEraseEntities(true, entityTypesArray, ignoreEntityArray);

		// Quick check if the destination tile is free
		if(map[destinationNode.y][destinationNode.x] != 0) {
			this.path = null;

			// Erase the entities from the collision map						
			this.getPathAddEraseEntities(false, entityTypesArray, ignoreEntityArray);

			return;
		}

		// Our two lists
		var open = [],
			closed = [];

		// The hash table for faster searching, if a tile already has a node
		var nodes = {};

		// Some variables we need later ...
		var bestCost, bestNode, currentNode, newX, newY, tempG, newNode, lastDirection, direction;

		// Push the start node on the open list
		open.push(startNode);

		// And save it in the hash table
		nodes[startNode.x + ',' + startNode.y] = startNode;

		// Until the destination is found work off the open nodes
		while(open.length > 0) {
			// First find the best open node (smallest f value)
			bestCost = open[0].f;
			bestNode = 0;

			for(var i = 1; i < open.length; i++) {
				if(open[i].f < bestCost) {
					bestCost = open[i].f;
					bestNode = i;
				}
			}

			// The best open node is our currentNode
			currentNode = open[bestNode];

			// Check if we've reached our destination
			if(currentNode.x == destinationNode.x && currentNode.y == destinationNode.y) {
				// Add the destination to the path
				this.path = [{
					x: destinationNode.x * mapTilesize,
					y: destinationNode.y * mapTilesize
				}];

				// direction
				// 0 stand for X and Y change
				// 1 stands for X change
				// 2 stand for Y change
				// Get the direction
				if(currentNode.x != closed[currentNode.p].x && currentNode.y != closed[currentNode.p].y) {
					lastDirection = 0;
				} else if(currentNode.x != closed[currentNode.p].x && currentNode.y == closed[currentNode.p].y) {
					lastDirection = 1;
				} else if(currentNode.x == closed[currentNode.p].x && currentNode.y != closed[currentNode.p].y) {
					lastDirection = 2;
				}

				// Go up the chain to recreate the path 
				while(true) {
					currentNode = closed[currentNode.p];

					// Stop when you get to the start node ...
					if(currentNode.p == -1) {
						// Erase the entities from the collision map						
						this.getPathAddEraseEntities(false, entityTypesArray, ignoreEntityArray);
						
						return;
					}

					// Get the direction
					if(currentNode.x != closed[currentNode.p].x && currentNode.y != closed[currentNode.p].y) {
						direction = 0;
					} else if(currentNode.x != closed[currentNode.p].x && currentNode.y == closed[currentNode.p].y) {
						direction = 1;
					} else if(currentNode.x == closed[currentNode.p].x && currentNode.y != closed[currentNode.p].y) {
						direction = 2;
					}

					// Only save the path node, if the path changes the direction
					if(direction != lastDirection) {
						// Add the steps to the path
						this.path.unshift({
							x: currentNode.x * mapTilesize,
							y: currentNode.y * mapTilesize
						});
					}

					lastDirection = direction;
				}
			}

			// Erase the current node from the open list
			open.splice(bestNode, 1);

			// And add it to the closed list
			closed.push(currentNode);
			// Also set the indicator to closed
			currentNode.closed = true;

			// Directions
			// 1 4 6
			// 2 X 7
			// 3 5 8
			// 0 is ignored for start and end node
			direction = 0;

			// Now create all 8 neighbors of the node
			for(var dx = -1; dx <= 1; dx++) {
				for(var dy = -1; dy <= 1; dy++) {
					if(!diagonalMovement) {
						// Skips checking of diagonals, when diagonalMovement is false
						if(Math.abs(dx) == Math.abs(dy)) {
							continue;
						}
					}

					// Don't check the parent node, which is in the middle
					if(dx == 0 && dy == 0) {
						continue;
					}

					direction++;

					newX = currentNode.x + dx;
					newY = currentNode.y + dy;

					// Check if the node is on the map
					if(newX < 0 || newX >= mapWidth || newY < 0 || newY >= mapHeight) {
						continue;
					}

					// Check if the tile is free
					if(map[newY][newX] != 0) {
						continue;
					}

					// Only use the upper left node, when both neighbor are not a wall
					if(dx == -1 && dy == -1 && (map[currentNode.y - 1][currentNode.x] != 0 || map[currentNode.y][currentNode.x - 1] != 0)) {
						continue;
					}

					// Only use the upper right node, when both neighbor are not a wall
					if(dx == 1 && dy == -1 && (map[currentNode.y - 1][currentNode.x] != 0 || map[currentNode.y][currentNode.x + 1] != 0)) {
						continue;
					}

					// Only use the lower left node, when both neighbor are not a wall
					if(dx == -1 && dy == 1 && (map[currentNode.y][currentNode.x - 1] != 0 || map[currentNode.y + 1][currentNode.x] != 0)) {
						continue;
					}

					// Only use the lower right node, when both neighbor are not a wall
					if(dx == 1 && dy == 1 && (map[currentNode.y][currentNode.x + 1] != 0 || map[currentNode.y + 1][currentNode.x] != 0)) {
						continue;
					}

					// Check if this tile already has a node
					if(nodes[newX + ',' + newY]) {
						// When the node is closed continue
						if(nodes[newX + ',' + newY].closed) {
							continue;
						}

						// Calculate the g value
						tempG = currentNode.g + Math.sqrt(Math.pow(newX - currentNode.x, 2) + Math.pow(newY - currentNode.y, 2));

						// When the direction changed
						if(currentNode.d != direction) {
							if(currentNode.d == 1 && (direction == 2 || direction == 4)) {
								tempG = tempG + directionChangeMalus45degree;
							} else if(currentNode.d == 2 && (direction == 1 || direction == 3)) {
								tempG = tempG + directionChangeMalus45degree;
							} else if(currentNode.d == 3 && (direction == 2 || direction == 5)) {
								tempG = tempG + directionChangeMalus45degree;
							} else if(currentNode.d == 4 && (direction == 1 || direction == 6)) {
								tempG = tempG + directionChangeMalus45degree;
							} else if(currentNode.d == 5 && (direction == 3 || direction == 8)) {
								tempG = tempG + directionChangeMalus45degree;
							} else if(currentNode.d == 6 && (direction == 4 || direction == 7)) {
								tempG = tempG + directionChangeMalus45degree;
							} else if(currentNode.d == 7 && (direction == 6 || direction == 8)) {
								tempG = tempG + directionChangeMalus45degree;
							} else if(currentNode.d == 8 && (direction == 5 || direction == 7)) {
								tempG = tempG + directionChangeMalus45degree;
							} else {
								tempG = tempG + directionChangeMalus90degree;
							}
						}

						// If it is smaller than the g value in the existing node, update the node
						if(tempG < nodes[newX + ',' + newY].g) {
							nodes[newX + ',' + newY].g = tempG;
							nodes[newX + ',' + newY].f = tempG + nodes[newX + ',' + newY].h;
							nodes[newX + ',' + newY].p = closed.length - 1;
							nodes[newX + ',' + newY].d = direction;
						}

						continue;
					}

					// After this thousand checks we create an new node
					newNode = new asfeNode(newX, newY, closed.length - 1, direction);
					// Put it on the hash list
					nodes[newNode.x + ',' + newNode.y] = newNode;

					// Fill it with values
					newNode.g = currentNode.g + Math.sqrt(Math.pow(newNode.x - currentNode.x, 2) + Math.pow(newNode.y - currentNode.y, 2));

					// When the direction changed
					if(currentNode.d != newNode.d && currentNode.d != 0) {
						if(currentNode.d == 1 && (newNode.d == 2 || newNode.d == 4)) {
							newNode.g = newNode.g + directionChangeMalus45degree;
						} else if(currentNode.d == 2 && (newNode.d == 1 || newNode.d == 3)) {
							newNode.g = newNode.g + directionChangeMalus45degree;
						} else if(currentNode.d == 3 && (newNode.d == 2 || newNode.d == 5)) {
							newNode.g = newNode.g + directionChangeMalus45degree;
						} else if(currentNode.d == 4 && (newNode.d == 1 || newNode.d == 6)) {
							newNode.g = newNode.g + directionChangeMalus45degree;
						} else if(currentNode.d == 5 && (newNode.d == 3 || newNode.d == 8)) {
							newNode.g = newNode.g + directionChangeMalus45degree;
						} else if(currentNode.d == 6 && (newNode.d == 4 || newNode.d == 7)) {
							newNode.g = newNode.g + directionChangeMalus45degree;
						} else if(currentNode.d == 7 && (newNode.d == 6 || newNode.d == 8)) {
							newNode.g = newNode.g + directionChangeMalus45degree;
						} else if(currentNode.d == 8 && (newNode.d == 5 || newNode.d == 7)) {
							newNode.g = newNode.g + directionChangeMalus45degree;
						} else {
							newNode.g = newNode.g + directionChangeMalus90degree;
						}
					}

					// If diagonalMovement is true, we use the diagonal distance heuristic
					if(diagonalMovement) {
						var h_diagonal = Math.min(Math.abs(newNode.x - destinationNode.x), Math.abs(newNode.y - destinationNode.y));
						var h_straight = Math.abs(newNode.x - destinationNode.x) + Math.abs(newNode.y - destinationNode.y);

						newNode.h = (diagonalMovementCosts * h_diagonal) + (h_straight - (2 * h_diagonal));
					} else {
						// If it is false, we use the manhattan distance heuristic
						newNode.h = Math.abs(newNode.x - destinationNode.x) + Math.abs(newNode.y - destinationNode.y);
					}

					newNode.f = newNode.g + newNode.h;

					// And push it on the open list ...
					open.push(newNode);
				}
			}
		}

		// No path found ...
		this.path = null;
		
		// Erase the entities from the collision map	
		this.getPathAddEraseEntities(false, entityTypesArray, ignoreEntityArray);

		return;
	},

	getPathAddEraseEntities: function(addErase, entityTypesArray, ignoreEntityArray) {
		var ignoreThisEntity;
		var useThisMap = null;
		if (ig.game.aiMap == null) {
		    useThisMap = ig.game.collisionMap;
		} else {
		    useThisMap = ig.game.aiMap;
		}
		// Add or erase the entity types to the collision map
		// Go through the entityTypesArray
		for(i = 0; i < entityTypesArray.length; i++) {
			var entities = ig.game.getEntitiesByType(entityTypesArray[i]);

			// Get every entity of this type
			for(j = 0; j < entities.length; j++) {
				ignoreThisEntity = false;

				// Check if it is excludes from the the check
				for(k = 0; k < ignoreEntityArray.length; k++) {
					if(ignoreEntityArray[k].id == entities[j].id) {
						ignoreThisEntity = true;
					}
				}

				// Add or erase the entity to the collision map
				if (!ignoreThisEntity) {
				    //console.log("ERASE STATUS:" + addErase + " " + entities[j].entityType);
				    if (entities[j] != undefined && useThisMap.data != undefined && addErase != undefined && entities[j].pos.x >= 0 && entities[j].pos.y >= 0) {//ADDED TO AVOID ERROR OF UNDEFINED ENTITIES BEING THROWN
				        //console.log("PathFinding: Do my entities have pos y and pos x values? " + entities[j].pos.x + ":" + entities[j].pos.y);
                        //Alright. Since I move entities off screen temporarily to "hide them", that is causing rounding issues. I need to keep those entities ignored.
				        if (addErase && useThisMap.data[(entities[j].pos.y / useThisMap.tilesize).floor()][(entities[j].pos.x / useThisMap.tilesize).floor()] == 0) {
				            useThisMap.data[(entities[j].pos.y / useThisMap.tilesize).floor()][(entities[j].pos.x / useThisMap.tilesize).floor()] = 9999;

				        } else if (!addErase && useThisMap.data[(entities[j].pos.y / useThisMap.tilesize).floor()][(entities[j].pos.x / useThisMap.tilesize).floor()] == 9999) {
				            useThisMap.data[(entities[j].pos.y / useThisMap.tilesize).floor()][(entities[j].pos.x / useThisMap.tilesize).floor()] = 0;

				        }
				    }
				}
			}
		}
	},
	

	followPath: function(speed, alignOnNearestTile) {
		if(alignOnNearestTile == null) {
			alignOnNearestTile = false;
		}
		var useThisMap = null;
		if (ig.game.aiMap == null) {
		    useThisMap = ig.game.collisionMap;
		} else {
		    useThisMap = ig.game.aiMap;
		}
		var p = this.body.GetPosition();
		// If the path was erased before the entity has gotten to his destination and stands between two tiles, this little check will adlign on nearest tile
		if(!this.path && alignOnNearestTile) {
			// Get the coordinates of the current tile
		    var cx = (this.pos.x / useThisMap.tilesize).floor() * useThisMap.tilesize,
				cy = (this.pos.y / useThisMaptilesize).floor() * useThisMap.tilesize;

			// Check if our entity is align on it
			if(cx != this.pos.x || cy != this.pos.y) {
				// Get the x dinstance to the current tile
				var dx = this.pos.x - cx,
					dy = this.pos.y - cy;

				// Get the y distance to the next tile
			    var dxp = cx + useThisMap.tilesize - this.pos.x,
					dyp = cy + useThisMap.tilesize - this.pos.y;

				// Choose the smaller distance
				if (dx < dxp) {
					var tx = cx;
				} else {
				    var tx = cx + useThisMap.tilesize;
				}

				if (dy < dyp) {
					var ty = cy;
				} else {
				    var ty = cy + useThisMap.tilesize;
				}

				// Add it to the path
				this.path = [{
					x: tx,
					y: ty
				}];
			}
		}

		// Only do something if there is a path ...
		if(this.path) {
			// Did we reached a waypoint?
			//MOD for Hardpoint
				//Get target center point
		    var targetCenter = {
		        x: this.path[0].x + (useThisMap.tilesize / 2),
		        y: this.path[0].y + (useThisMap.tilesize / 2)
		    };
				//Get this current ents body position center and draw out the tile size and get the boundaries
				var thisCenterTile = {
					x1:p.x / Box2D.SCALE - (useThisMap.tilesize/2),
					y1:p.y / Box2D.SCALE - (useThisMap.tilesize/2),
					x2:p.x / Box2D.SCALE + (useThisMap.tilesize/2),
					y2:p.y / Box2D.SCALE + (useThisMap.tilesize/2),
					c: {x:p.x / Box2D.SCALE,y:p.y / Box2D.SCALE}
				};

			//
			//Distance currently from target
			if(this.lastbox2dtile.c != undefined && this.lastbox2dtile.c != null){
				var dCurrent = Math.sqrt( (thisCenterTile.c.x-targetCenter.x)*(thisCenterTile.c.x-targetCenter.x) + (thisCenterTile.c.y-targetCenter.y)*(thisCenterTile.c.y-targetCenter.y) );

				
				var dLast = Math.sqrt( (this.lastbox2dtile.c.x-targetCenter.x)*(this.lastbox2dtile.c.x-targetCenter.x) + (this.lastbox2dtile.c.y-targetCenter.y)*(this.lastbox2dtile.c.y-targetCenter.y) );
				//is the current distance greater thant he last distance? If so, I have passed through it.
				if (dCurrent < 32) {
				
			    	// Was it the last waypoint?
			    	if(this.path.length == 1) {
			    		// Stopp the movement and set the position
			    		this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0,0));
			    		//this.body.SetPosition(new Box2D.Common.Math.b2Vec2(this.path[0].x* Box2D.SCALE,this.path[0].y * Box2D.SCALE));

			    	}
			    	console.log("reached wp:", this.path.length, dCurrent, dLast);
			    	// Erase the last waypoint
			    	this.path.splice(0, 1);

			    	// if it was the last nothing to do ...
			    	if(!this.path.length) {
			    		this.path = null;
			    		return;
			    	}
				}
			}


			//if(((thisCenterTile.x1 >= this.path[0].x && this.lastbox2dtile.x1 < this.path[0].x) || (thisCenterTile.x1 <= this.path[0].x && this.lastbox2dtile.x1 > this.path[0].x) || thisCenterTile.x1 == this.path[0].x) && 
			//((thisCenterTile.y1 >= this.path[0].y &&this.lastbox2dtile.y1 < this.path[0].y) || (thisCenterTile.y1 <= this.path[0].y && this.lastbox2dtile.y1 > this.path[0].y) || thisCenterTile.y1== this.path[0].y)) {
			//	// Was it the last waypoint?
			//	if(this.path.length == 1) {
			//		// Stopp the movement and set the position
			//		this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0,0));
			//		//this.body.SetPosition(new Box2D.Common.Math.b2Vec2(this.path[0].x* Box2D.SCALE,this.path[0].y * Box2D.SCALE));
					
			//	}
			//	console.log("reached wp:", this.path.length);
			//	// Erase the last waypoint
			//	this.path.splice(0, 1);

			//	// if it was the last nothing to do ...
			//	if(!this.path.length) {
			//		this.path = null;
			//		return;
			//	}
			//}


			//Get Angle to point to decide if we should start turning
			var angleRadians = Math.atan2((this.path[0].y + (useThisMap.tilesize/2))- (p.y / Box2D.SCALE), (this.path[0].x + (useThisMap.tilesize/2)) - (p.x/ Box2D.SCALE));
			//Apply forward speed if the angle is within a +/- 45 deg range, with the speed increasing
			

            var targetAngleDeg = Math.round(angleRadians * 180 / Math.PI);
            var currentBodyAngleDeg = Math.round(this.body.GetAngle() * 180 / Math.PI);

			//Convert to a 360 deg angle
			targetAngleDeg = ig.game.convertAngleTo360(targetAngleDeg);
			currentBodyAngleDeg = ig.game.convertAngleTo360(currentBodyAngleDeg);
			//

			// Get the heading direction
			if(currentBodyAngleDeg > 195 && currentBodyAngleDeg <= 240) {//Up and left
				this.headingDirection = 1;
			} else if(currentBodyAngleDeg > 150 && currentBodyAngleDeg <= 195) {
				this.headingDirection = 2;
			} else if(currentBodyAngleDeg > 125 && currentBodyAngleDeg <= 150) { 
				this.headingDirection = 3;
			} else if(currentBodyAngleDeg > 105 && currentBodyAngleDeg <= 150) {
				this.headingDirection = 4;
			} else if(currentBodyAngleDeg > 60 && currentBodyAngleDeg <= 105) {
				this.headingDirection = 5;
			} else if(currentBodyAngleDeg > 285 && currentBodyAngleDeg <= 330) {
				this.headingDirection = 6;
			} else if((currentBodyAngleDeg > 330 && currentBodyAngleDeg <= 360) || (currentBodyAngleDeg > 0 && currentBodyAngleDeg <= 15)) {
				this.headingDirection = 7;
			} else if(currentBodyAngleDeg > 15 && currentBodyAngleDeg <= 60) {
				this.headingDirection = 8;
			}

			//Apply angular velocity as needed
			if (currentBodyAngleDeg > targetAngleDeg + 5 || currentBodyAngleDeg < targetAngleDeg - 5) {//Give 3 deg range

                if (currentBodyAngleDeg < targetAngleDeg) {
                    if (Math.abs(currentBodyAngleDeg - targetAngleDeg) < 180) {
                            this.turn(this.turnRate);
                    } else {
                            this.turn(-this.turnRate);
                    }
                } else {
                    if (Math.abs(currentBodyAngleDeg - targetAngleDeg) < 180) {
                            this.turn(-this.turnRate);
                    } else {
                            this.turn(this.turnRate);
                    }
                }

            } else {
                //Stop moving since we have target in sights				
				this.body.SetAngularVelocity(0);
            }
			//Apply forward movement, unless backing up behavior set
			//Only drive if angles of current and target are within a certain limit (45 +/-) drive forward . 
			if ((currentBodyAngleDeg < targetAngleDeg + 45 && currentBodyAngleDeg > targetAngleDeg - 45)) {//Give 3 deg range

				this.drive(false); // True to reverse
			}else if(currentBodyAngleDeg < targetAngleDeg + 135 && currentBodyAngleDeg > targetAngleDeg - 135){
				//Need some more AI if it should reverse or just turn
				this.drive(true); // True to reverse
			}

		} else {
			// When there is no path, don't move ...
			//this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0,0));
			this.applyBreaks();

			this.headingDirection = 0;
		}
		this.lastbox2dtile = {
			x1:p.x / Box2D.SCALE - (useThisMap.tilesize/2),
			y1:p.y / Box2D.SCALE - (useThisMap.tilesize/2),
			x2:p.x / Box2D.SCALE + (useThisMap.tilesize/2),
			y2:p.y / Box2D.SCALE + (useThisMap.tilesize/2),
			c: {x:p.x / Box2D.SCALE,y:p.y / Box2D.SCALE}
		}
	},

	drawPath: function(r, g, b, a, lineWidth) {
	    if (this.path) {
	        var useThisMap = null;
	        if (ig.game.aiMap == null) {
	            useThisMap = ig.game.collisionMap;
	        } else {
	            useThisMap = ig.game.aiMap;
	        }
	        var mapTilesize = useThisMap.tilesize;

			ig.system.context.strokeStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
			ig.system.context.lineWidth = lineWidth * ig.system.scale;

			ig.system.context.beginPath();

			ig.system.context.moveTo(
			ig.system.getDrawPos(this.pos.x + this.size.x / 2 - ig.game.screen.x), ig.system.getDrawPos(this.pos.y + this.size.y / 2 - ig.game.screen.y));

			for(var i = 0; i < this.path.length; i++) {
				ig.system.context.lineTo(
				ig.system.getDrawPos(this.path[i].x + mapTilesize / 2 - ig.game.screen.x), ig.system.getDrawPos(this.path[i].y + mapTilesize / 2 - ig.game.screen.y));
			}

			ig.system.context.stroke();
			ig.system.context.closePath();
		}
	}
});

asfeNode = function(x, y, p, d) {
	// Coordinates
	this.x = x;
	this.y = y;
	// Parent
	this.p = p;
	// Direction
	this.d = d;
	// G, H and F
	this.g = 0;
	this.h = 0;
	this.f = 0;
	// Closed indicator
	this.closed = false;
};

});