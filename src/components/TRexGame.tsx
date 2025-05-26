import React, { useEffect, useRef, useState, useCallback } from 'react';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlayerObject extends GameObject {
  velocityY: number;
  isJumping: boolean;
}

interface Obstacle extends GameObject {
  passed: boolean;
}

const TRexGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 250 });
  const [scaleFactor, setScaleFactor] = useState(1);

  // Base canvas dimensions (will be scaled)
  const BASE_WIDTH = 800;
  const BASE_HEIGHT = 250;
  const GROUND_Y = 200;
  const MAX_SCORE = 99999;
  
  // Position T-Rex in the middle
  const PLAYER_X_POS = BASE_WIDTH / 2 - 20; // Center position

  // Load high score from localStorage on component mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem('trex-high-score');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  // Game state
  const gameState = useRef({
    player: { 
      x: PLAYER_X_POS, 
      y: 150, 
      width: 40, 
      height: 40, 
      velocityY: 0, 
      isJumping: false 
    } as PlayerObject,
    obstacles: [] as Obstacle[],
    ground: { x: 0, y: 200, width: 800, height: 20 },
    gameSpeed: 1.5,
    gravity: 0.3,
    jumpPower: -10,
    obstacleSpawnRate: 0.006,
    lastObstacleX: 800,
    scoreCounter: 0,
    animationFrame: 0, // Track animation frame for smoother animations
    animationSpeed: 0.25, // Control animation speed
    lastThemeChangeScore: 0 // Track when we last changed theme
  });

  // Use ref for current score to avoid closure issues in game loop
  const currentScoreRef = useRef(0);

  // Handle canvas resize based on container size
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        // Get the container width
        const containerWidth = containerRef.current.clientWidth;
        
        // Calculate the appropriate height based on original aspect ratio
        const aspectRatio = BASE_HEIGHT / BASE_WIDTH;
        const containerHeight = Math.floor(containerWidth * aspectRatio);
        
        // Calculate scale factor for game elements
        const newScaleFactor = containerWidth / BASE_WIDTH;
        
        setCanvasSize({
          width: containerWidth,
          height: containerHeight
        });
        setScaleFactor(newScaleFactor);
      }
    };

    // Initial size
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: PlayerObject) => {
    ctx.save();
    // Scale all drawing operations
    ctx.scale(scaleFactor, scaleFactor);
    
    ctx.fillStyle = darkTheme ? '#aaaaaa' : '#535353';
    
    // Get animation frame for leg movement (smoother animation synced with game speed)
    const dynamicAnimationSpeed = gameState.current.animationSpeed * (gameState.current.gameSpeed / 1.5); // Scale with speed
    gameState.current.animationFrame += dynamicAnimationSpeed;
    const runPhase = Math.sin(gameState.current.animationFrame) > 0; 
    
    // Draw improved T-Rex body
    ctx.beginPath();
    
    // Body
    ctx.roundRect(player.x, player.y + 5, 30, 35, [3, 3, 0, 0]);
    
    // Head
    ctx.roundRect(player.x + 20, player.y - 15, 25, 25, [5, 5, 0, 5]);
    
    // Tail
    ctx.moveTo(player.x, player.y + 15);
    ctx.lineTo(player.x - 10, player.y + 5);
    ctx.lineTo(player.x - 5, player.y + 20);
    ctx.lineTo(player.x, player.y + 15);
    
    // Neck
    ctx.moveTo(player.x + 25, player.y);
    ctx.bezierCurveTo(
      player.x + 25, player.y - 5,
      player.x + 25, player.y - 10,
      player.x + 25, player.y - 15
    );

    ctx.fill();
    ctx.closePath();
    
    // Draw eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(player.x + 36, player.y - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw pupil
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(player.x + 37, player.y - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw mouth
    ctx.beginPath();
    ctx.moveTo(player.x + 45, player.y);
    ctx.lineTo(player.x + 38, player.y + 2);
    ctx.strokeStyle = darkTheme ? '#ffffff' : '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw legs with animation
    ctx.fillStyle = darkTheme ? '#aaaaaa' : '#535353';
    
    // Only animate legs if not jumping
    if (!player.isJumping) {
      // Front leg - alternating positions for run animation
      if (runPhase) {
        // Front position
        ctx.beginPath();
        ctx.moveTo(player.x + 25, player.y + 40);
        ctx.lineTo(player.x + 25 + 8, player.y + 55);
        ctx.lineTo(player.x + 30 + 8, player.y + 55);
        ctx.lineTo(player.x + 30, player.y + 40);
        ctx.fill();
        
        // Back leg - behind position
        ctx.beginPath();
        ctx.moveTo(player.x + 10, player.y + 40);
        ctx.lineTo(player.x + 10 - 4, player.y + 48);
        ctx.lineTo(player.x + 15 - 4, player.y + 48);
        ctx.lineTo(player.x + 15, player.y + 40);
        ctx.fill();
      } else {
        // Front leg - behind position
        ctx.beginPath();
        ctx.moveTo(player.x + 25, player.y + 40);
        ctx.lineTo(player.x + 25 - 4, player.y + 48);
        ctx.lineTo(player.x + 30 - 4, player.y + 48);
        ctx.lineTo(player.x + 30, player.y + 40);
        ctx.fill();
        
        // Back leg - front position
        ctx.beginPath();
        ctx.moveTo(player.x + 10, player.y + 40);
        ctx.lineTo(player.x + 10 + 8, player.y + 55);
        ctx.lineTo(player.x + 15 + 8, player.y + 55);
        ctx.lineTo(player.x + 15, player.y + 40);
        ctx.fill();
      }
    } else {
      // When jumping, draw legs in a fixed position
      // Front leg
      ctx.beginPath();
      ctx.moveTo(player.x + 25, player.y + 40);
      ctx.lineTo(player.x + 30, player.y + 45);
      ctx.lineTo(player.x + 35, player.y + 45);
      ctx.lineTo(player.x + 30, player.y + 40);
      ctx.fill();
      
      // Back leg
      ctx.beginPath();
      ctx.moveTo(player.x + 10, player.y + 40);
      ctx.lineTo(player.x + 5, player.y + 45);
      ctx.lineTo(player.x + 10, player.y + 45);
      ctx.lineTo(player.x + 15, player.y + 40);
      ctx.fill();
    }
    
    // Draw arm
    ctx.beginPath();
    ctx.moveTo(player.x + 25, player.y + 15);
    ctx.lineTo(player.x + 35, player.y + 15);
    ctx.lineTo(player.x + 35, player.y + 20);
    ctx.lineTo(player.x + 25, player.y + 20);
    ctx.fill();
    
    // Restore state
    ctx.restore();
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obstacle: Obstacle) => {
    ctx.save();
    // Scale all drawing operations
    ctx.scale(scaleFactor, scaleFactor);
    
    // Use lighter green for cacti in dark theme
    ctx.fillStyle = darkTheme ? '#90ee90' : '#2e8b57'; // Light green in dark theme
    
    // Function to draw a single cactus segment
    const drawCactusSegment = (x: number, y: number, width: number, height: number, hasArms: boolean = true) => {
      // Main stem
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, [3, 3, 0, 0]);
      ctx.fill();
      
      // Top of cactus (rounded)
      ctx.beginPath();
      ctx.arc(x + width / 2, y, width / 2, 0, Math.PI, true);
      ctx.fill();
      
      // Cactus texture - vertical lines
      // Darker lines for light cacti in dark mode, lighter lines for dark cacti in light mode
      ctx.strokeStyle = darkTheme ? '#2e8b57' : '#1a6b37';
      ctx.lineWidth = 1;
      
      // Draw vertical lines as texture
      for (let i = 3; i < width; i += 4) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + height);
        ctx.stroke();
      }
      
      // Draw arms if needed
      if (hasArms) {
        // Left arm
        const leftArmHeight = height * 0.4;
        const leftArmY = y + height * 0.25;
        
        ctx.fillStyle = darkTheme ? '#90ee90' : '#2e8b57';
        ctx.beginPath();
        ctx.roundRect(x - width * 0.7, leftArmY, width * 0.7, leftArmHeight / 2, [3, 0, 0, 3]);
        ctx.fill();
        
        // Top of left arm
        ctx.beginPath();
        ctx.arc(x - width * 0.7 + (width * 0.7) / 2, leftArmY, (width * 0.7) / 2, 0, Math.PI, true);
        ctx.fill();
        
        // Right arm
        const rightArmHeight = height * 0.3;
        const rightArmY = y + height * 0.4;
        
        ctx.beginPath();
        ctx.roundRect(x + width, rightArmY, width * 0.6, rightArmHeight / 2, [0, 3, 3, 0]);
        ctx.fill();
        
        // Top of right arm
        ctx.beginPath();
        ctx.arc(x + width + (width * 0.6) / 2, rightArmY, (width * 0.6) / 2, 0, Math.PI, true);
        ctx.fill();
        
        // Add texture to arms
        ctx.strokeStyle = darkTheme ? '#2e8b57' : '#1a6b37';
        
        // Left arm texture
        for (let i = 3; i < width * 0.7; i += 4) {
          ctx.beginPath();
          ctx.moveTo(x - width * 0.7 + i, leftArmY);
          ctx.lineTo(x - width * 0.7 + i, leftArmY + leftArmHeight / 2);
          ctx.stroke();
        }
        
        // Right arm texture
        for (let i = 3; i < width * 0.6; i += 4) {
          ctx.beginPath();
          ctx.moveTo(x + width + i, rightArmY);
          ctx.lineTo(x + width + i, rightArmY + rightArmHeight / 2);
          ctx.stroke();
        }
      }
    };
    
    // Draw main cactus
    drawCactusSegment(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    
    // Add spines to cactus
    ctx.strokeStyle = darkTheme ? '#2e8b57' : '#1a6b37';
    ctx.lineWidth = 1;
    
    // Left side spines
    for (let i = 5; i < obstacle.height; i += 8) {
      ctx.beginPath();
      ctx.moveTo(obstacle.x, obstacle.y + i);
      ctx.lineTo(obstacle.x - 3, obstacle.y + i - 2);
      ctx.stroke();
    }
    
    // Right side spines
    for (let i = 5; i < obstacle.height; i += 8) {
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.width, obstacle.y + i);
      ctx.lineTo(obstacle.x + obstacle.width + 3, obstacle.y + i - 2);
      ctx.stroke();
    }
    
    // Restore state
    ctx.restore();
  };

  const drawGround = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    // Scale all drawing operations
    ctx.scale(scaleFactor, scaleFactor);
    
    ctx.fillStyle = darkTheme ? '#aaaaaa' : '#535353';
    // Draw ground line
    ctx.fillRect(0, GROUND_Y, BASE_WIDTH, 2);
    
    // Draw more interesting ground pattern with parallax effect
    const groundOffset = gameState.current.ground.x % 40;
    
    // Far background elements (slow moving)
    ctx.fillStyle = darkTheme ? '#666' : '#777';
    ctx.beginPath();
    for (let i = 0; i < BASE_WIDTH; i += 80) {
      ctx.arc(i - (groundOffset * 0.4), GROUND_Y + 8, 1, 0, Math.PI * 2);
    }
    ctx.fill();
    
    // Mid-ground elements (medium speed)
    ctx.fillStyle = darkTheme ? '#888' : '#666';
    ctx.beginPath();
    for (let i = 0; i < BASE_WIDTH; i += 60) {
      ctx.arc(i - (groundOffset * 0.7), GROUND_Y + 6, 1.3, 0, Math.PI * 2);
    }
    ctx.fill();
    
    // Foreground elements (matching game speed)
    ctx.fillStyle = darkTheme ? '#aaaaaa' : '#535353';
    ctx.beginPath();
    for (let i = 0; i < BASE_WIDTH; i += 40) {
      // Small rocks/pebbles
      ctx.arc(i - groundOffset, GROUND_Y + 5, 1.5, 0, Math.PI * 2);
      ctx.arc(i - groundOffset + 10, GROUND_Y + 4, 1, 0, Math.PI * 2);
      ctx.arc(i - groundOffset + 25, GROUND_Y + 6, 2, 0, Math.PI * 2);
    }
    ctx.fill();
    
    ctx.restore();
  };

  const drawScore = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    // Scale all drawing operations
    ctx.scale(scaleFactor, scaleFactor);
    
    ctx.fillStyle = darkTheme ? '#ffffff' : '#535353';
    ctx.font = '20px monospace';
    ctx.textAlign = 'right';
    // Use currentScoreRef to always display the latest score
    ctx.fillText(`Score: ${currentScoreRef.current.toString().padStart(5, '0')}`, BASE_WIDTH - 20, 30);
    
    // Also display high score
    ctx.textAlign = 'left';
    ctx.fillText(`High Score: ${highScore.toString().padStart(5, '0')}`, 20, 30);
    
    ctx.restore();
  };

  const drawGameOver = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    // Scale all drawing operations
    ctx.scale(scaleFactor, scaleFactor);
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    
    // Create highlighted box with white gradient
    const boxWidth = 400;
    const boxHeight = 220;
    const boxX = BASE_WIDTH / 2 - boxWidth / 2;
    const boxY = BASE_HEIGHT / 2 - 100;
    
    // Create gradient for box background
    const boxGradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
    boxGradient.addColorStop(0, darkTheme ? 'rgba(60, 60, 60, 0.9)' : 'rgba(230, 230, 230, 0.9)');
    boxGradient.addColorStop(1, darkTheme ? 'rgba(40, 40, 40, 0.9)' : 'rgba(250, 250, 250, 0.9)');
    
    // Draw main box
    ctx.fillStyle = boxGradient;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 15);
    ctx.fill();
    
    // Create white gradient border
    ctx.lineWidth = 5;
    const borderGradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
    borderGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    borderGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    borderGradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
    ctx.strokeStyle = borderGradient;
    ctx.stroke();
    
    // Game over text with better contrast
    ctx.fillStyle = darkTheme ? '#ffffff' : '#333333';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', BASE_WIDTH / 2, boxY + 60);
    
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`Final Score: ${currentScoreRef.current}`, BASE_WIDTH / 2, boxY + 100);
    
    if (currentScoreRef.current > highScore) {
      // Add a special highlight for new high score
      const highScoreGradient = ctx.createLinearGradient(
        BASE_WIDTH / 2 - 100, boxY + 140, 
        BASE_WIDTH / 2 + 100, boxY + 140
      );
      highScoreGradient.addColorStop(0, '#ffd700');  // Gold
      highScoreGradient.addColorStop(0.5, '#fff4b3'); // Light gold
      highScoreGradient.addColorStop(1, '#ffd700');  // Gold
      ctx.fillStyle = highScoreGradient;
      ctx.fillText('NEW HIGH SCORE!', BASE_WIDTH / 2, boxY + 140);
    }
    
    ctx.fillStyle = darkTheme ? '#ffffff' : '#333333';
    ctx.fillText('Press SPACE to restart', BASE_WIDTH / 2, boxY + 180);
    
    // Add touch instruction for mobile
    if ('ontouchstart' in window) {
      ctx.font = 'bold 16px monospace';
      ctx.fillText('(or tap screen)', BASE_WIDTH / 2, boxY + 205);
    }
    
    ctx.restore();
  };

  const drawWinScreen = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    // Scale all drawing operations
    ctx.scale(scaleFactor, scaleFactor);
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    
    // Create highlighted box with white gradient
    const boxWidth = 450;
    const boxHeight = 220;
    const boxX = BASE_WIDTH / 2 - boxWidth / 2;
    const boxY = BASE_HEIGHT / 2 - 100;
    
    // Create gradient for box background - more celebratory colors for win screen
    const boxGradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
    boxGradient.addColorStop(0, darkTheme ? 'rgba(70, 50, 120, 0.9)' : 'rgba(230, 240, 255, 0.9)');
    boxGradient.addColorStop(1, darkTheme ? 'rgba(40, 30, 80, 0.9)' : 'rgba(200, 225, 255, 0.9)');
    
    // Draw main box
    ctx.fillStyle = boxGradient;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 15);
    ctx.fill();
    
    // Create flashy gradient border for win screen
    ctx.lineWidth = 5;
    const borderGradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
    borderGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    borderGradient.addColorStop(0.3, 'rgba(255, 255, 150, 0.9)');
    borderGradient.addColorStop(0.6, 'rgba(150, 255, 255, 0.9)');
    borderGradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
    ctx.strokeStyle = borderGradient;
    ctx.stroke();
    
    // Win text with celebratory color
    const titleGradient = ctx.createLinearGradient(
      BASE_WIDTH / 2 - 200, boxY + 40, 
      BASE_WIDTH / 2 + 200, boxY + 40
    );
    titleGradient.addColorStop(0, '#ffd700');  // Gold
    titleGradient.addColorStop(0.5, '#fffacd'); // Light gold
    titleGradient.addColorStop(1, '#ffd700');  // Gold
    
    ctx.fillStyle = titleGradient;
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONGRATULATIONS!', BASE_WIDTH / 2, boxY + 45);
    ctx.fillText('YOU BROKE THE GAME!', BASE_WIDTH / 2, boxY + 95);
    
    ctx.fillStyle = darkTheme ? '#ffffff' : '#333333';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`Final Score: ${currentScoreRef.current}`, BASE_WIDTH / 2, boxY + 145);
    ctx.fillText('Press SPACE to restart', BASE_WIDTH / 2, boxY + 185);
    
    // Add touch instruction for mobile
    if ('ontouchstart' in window) {
      ctx.font = 'bold 16px monospace';
      ctx.fillText('(or tap screen)', BASE_WIDTH / 2, boxY + 205);
    }
    
    ctx.restore();
  };

  const drawStartScreen = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    // Scale all drawing operations
    ctx.scale(scaleFactor, scaleFactor);
    
    ctx.fillStyle = darkTheme ? '#ffffff' : '#535353';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('T-REX GAME', BASE_WIDTH / 2, BASE_HEIGHT / 2 - 40);
    
    ctx.font = 'bold 20px monospace';
    if ('ontouchstart' in window) {
      ctx.fillText('Tap to start', BASE_WIDTH / 2, BASE_HEIGHT / 2);
    } else {
      ctx.fillText('Press SPACE, ↑, or click to start', BASE_WIDTH / 2, BASE_HEIGHT / 2);
    }
    ctx.fillText('Jump over the cacti!', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 30);
    
    // Add game explanation
    ctx.font = 'bold 14px monospace';
    ctx.fillText("Dodge the obstacles as they approach the center", BASE_WIDTH / 2, BASE_HEIGHT / 2 + 60);
    
    // Display high score on start screen
    if (highScore > 0) {
      ctx.fillText(`High Score: ${highScore}`, BASE_WIDTH / 2, BASE_HEIGHT / 2 + 85);
    }
    
    ctx.restore();
  };

  const checkCollision = (rect1: GameObject, rect2: GameObject): boolean => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  };

  const jump = useCallback(() => {
    if (!gameStarted) {
      setGameStarted(true);
      return;
    }
    
    if (gameOver || gameWon) {
      resetGame();
      return;
    }

    if (!gameState.current.player.isJumping) {
      gameState.current.player.velocityY = gameState.current.jumpPower;
      gameState.current.player.isJumping = true;
    }
  }, [gameStarted, gameOver, gameWon]);

  const resetGame = () => {
    setScore(0);
    currentScoreRef.current = 0;
    setGameOver(false);
    setGameWon(false);
    setGameStarted(true);
    setDarkTheme(false); // Reset theme on game restart
    gameState.current = {
      player: { 
        x: PLAYER_X_POS, 
        y: 150, 
        width: 40, 
        height: 40, 
        velocityY: 0, 
        isJumping: false 
      } as PlayerObject,
      obstacles: [],
      ground: { x: 0, y: 200, width: 800, height: 20 },
      gameSpeed: 1.5,
      gravity: 0.3,
      jumpPower: -10,
      obstacleSpawnRate: 0.006,
      lastObstacleX: 800,
      scoreCounter: 0,
      animationFrame: 0,
      animationSpeed: 0.25,
      lastThemeChangeScore: 0
    };
  };

  // Update high score when game ends
  useEffect(() => {
    if (gameOver && currentScoreRef.current > highScore) {
      setHighScore(currentScoreRef.current);
      localStorage.setItem('trex-high-score', currentScoreRef.current.toString());
    }
  }, [gameOver, highScore]);

  // Check for theme changes based on score
  const checkThemeChange = (score: number) => {
    const lastThemeChangeScore = gameState.current.lastThemeChangeScore;
    const scoreThreshold = 120;
    
    // Change theme every 120 points
    if (Math.floor(score / scoreThreshold) > Math.floor(lastThemeChangeScore / scoreThreshold)) {
      setDarkTheme(prevTheme => !prevTheme);
      gameState.current.lastThemeChangeScore = score;
    }
  };

  const updateGame = () => {
    if (!gameStarted || gameOver || gameWon) return;

    const { player, obstacles, ground } = gameState.current;

    // Update player physics
    if (player.isJumping) {
      player.velocityY += gameState.current.gravity;
      player.y += player.velocityY;

      // Land on ground
      if (player.y >= 150) {
        player.y = 150;
        player.velocityY = 0;
        player.isJumping = false;
      }
    }

    // Move ground
    ground.x -= gameState.current.gameSpeed;

    // Generate obstacles
    if (Math.random() < gameState.current.obstacleSpawnRate && 
        BASE_WIDTH - gameState.current.lastObstacleX > 400) {
      obstacles.push({
        x: BASE_WIDTH,
        y: 175,
        width: 18,
        height: 25,
        passed: false
      });
      gameState.current.lastObstacleX = BASE_WIDTH;
    }

    // Update obstacles
    obstacles.forEach((obstacle, index) => {
      obstacle.x -= gameState.current.gameSpeed;

      // Check if player passed obstacle (when obstacle passes the center of the player)
      if (!obstacle.passed && obstacle.x + obstacle.width < player.x + player.width / 2) {
        obstacle.passed = true;
        // Update score directly on the ref for immediate display
        currentScoreRef.current += 10;
        // Also update React state for component updates
        setScore(currentScoreRef.current);
        
        // Check if we need to toggle theme
        checkThemeChange(currentScoreRef.current);
        
        // Check for win condition
        if (currentScoreRef.current >= MAX_SCORE) {
          setGameWon(true);
        }
      }

      // Check collision
      if (checkCollision(player, obstacle)) {
        setGameOver(true);
      }

      // Remove off-screen obstacles
      if (obstacle.x + obstacle.width < 0) {
        obstacles.splice(index, 1);
      }
    });

    // Increase game speed gradually based on score for better difficulty progression
    const baseSpeed = 1.5;
    const maxSpeed = 6.0; // Maximum speed cap
    const speedIncreaseRate = currentScoreRef.current * 0.0008; // Gradual increase based on score
    const newSpeed = Math.min(baseSpeed + speedIncreaseRate, maxSpeed);
    gameState.current.gameSpeed = newSpeed;
    
    // Also gradually increase obstacle spawn rate for more challenge
    const baseSpawnRate = 0.006;
    const maxSpawnRate = 0.015;
    const spawnRateIncrease = currentScoreRef.current * 0.000008;
    gameState.current.obstacleSpawnRate = Math.min(baseSpawnRate + spawnRateIncrease, maxSpawnRate);
    
    gameState.current.lastObstacleX -= gameState.current.gameSpeed;
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions based on container size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sky with gradient according to theme
    let skyGradient;
    if (darkTheme) {
      // Dark theme: white gradient to dark background
      skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.8);
      skyGradient.addColorStop(0, '#ffffff');  // White at top
      skyGradient.addColorStop(1, '#444444');  // Fade to dark gray near ground
      ctx.fillStyle = skyGradient;
    } else {
      // Light theme: blue gradient to white
      skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.8);
      skyGradient.addColorStop(0, '#c4e0f9');  // Light blue at top
      skyGradient.addColorStop(1, '#f7f7f7');  // Fade to white near ground
      ctx.fillStyle = skyGradient;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameStarted) {
      drawStartScreen(ctx);
      return;
    }

    // Draw game elements
    drawGround(ctx);
    drawPlayer(ctx, gameState.current.player);
    
    gameState.current.obstacles.forEach(obstacle => {
      drawObstacle(ctx, obstacle);
    });

    drawScore(ctx);

    if (gameWon) {
      drawWinScreen(ctx);
    } else if (gameOver) {
      drawGameOver(ctx);
    }
  };

  const gameLoop = () => {
    updateGame();
    render();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  // Set up event listeners for keyboard, mouse, and touch controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        jump();
      }
    };

    const handleClick = () => {
      jump();
    };

    const handleTouch = (event: TouchEvent) => {
      event.preventDefault();
      jump();
    };

    document.addEventListener('keydown', handleKeyPress);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleClick);
      canvas.addEventListener('touchstart', handleTouch);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (canvas) {
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('touchstart', handleTouch);
      }
    };
  }, [jump]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, gameWon]);

  // Sync currentScoreRef with score state
  useEffect(() => {
    currentScoreRef.current = score;
  }, [score]);

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${darkTheme ? 'bg-gray-900' : 'bg-gray-100'} p-4 transition-colors duration-500`}>
      <div 
        ref={containerRef} 
        className={`${darkTheme ? 'bg-gray-800 shadow-gray-700' : 'bg-white'} rounded-lg shadow-lg p-4 sm:p-6 transition-colors duration-500 w-full max-w-xl`}
      >
        <h1 className={`text-xl sm:text-3xl font-bold text-center mb-2 sm:mb-4 ${darkTheme ? 'text-gray-200' : 'text-gray-800'} transition-colors duration-500`}>T-Rex Game</h1>
        <canvas
          ref={canvasRef}
          className={`${darkTheme ? 'border-gray-700' : 'border-gray-300'} border-2 rounded cursor-pointer`}
          style={{ width: '100%', height: 'auto' }}
        />
        <div className={`mt-2 sm:mt-4 text-center ${darkTheme ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-500`}>
          <p className="text-xs sm:text-sm">
            {('ontouchstart' in window) ? 'Tap screen to jump' : 'Use SPACEBAR, ↑ arrow key, or click to jump'}
          </p>
          <p className="text-xs mt-1">Jump over the obstacles as they approach!</p>
          {highScore > 0 && (
            <p className="text-xs sm:text-sm mt-2 font-semibold">High Score: {highScore}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TRexGame;
