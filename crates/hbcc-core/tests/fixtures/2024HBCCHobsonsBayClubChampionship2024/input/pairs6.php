<!DOCTYPE html>
<html lang="en"><head> 
<meta charset="UTF-8">
<meta name="description" content="chess tournament">
<meta name="author" content="www.vegachess.com">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge"> 
<title>2024 HBCC Hobsons Bay Juniors Club Championship</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
<link rel="stylesheet" href="stylenew.css" type="text/css" >
    </head>
<body>
<div class="d-flex flex-column justify-content-between h-100">
 <nav class="navbar navbar-expand-lg fixed-top">
                <div class="container">    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarSupportedContent">
                        <ul class="navbar-nav me-auto mb-2 mb-lg-0"><li class="nav-item dropdown">
   <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Info</a>
<ul class="dropdown-menu">
<li><a class="dropdown-item" href="schedule.php"> Schedule </a></li><li><a class="dropdown-item" href="tourstat.php">Statistics</a></li> </ul></li><li class="nav-item dropdown">   <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Players</a>
<ul class="dropdown-menu"><li><a class="dropdown-item" href="index.php">Sorted by Rating</a></li><li><a class="dropdown-item" href="playersname.php">Sorted by Name</a></li></ul></li><li class="nav-item"><a class="nav-link " href="pairs7.php" >Pairings</a>
</li><li class="nav-item"><a class="nav-link" href="standings.php" >Standings</a>
</li><li class="nav-item dropdown">   <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Tables</a>
<ul class="dropdown-menu"><li><a class="dropdown-item" href="sortedcrosstable.php"> Cross table by score </a></li></ul></li><li class="nav-item dropdown">   <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Reports</a>
<ul class="dropdown-menu">          <li><a class="dropdown-item" href="felovar.php">FIDE Rating</a></li>          <li><a class="dropdown-item" href="fideplayercard.php">FIDE Player Card</a></li>           <li><a class="dropdown-item" href="nelovar.php">National rating</a></li>          <li><a class="dropdown-item" href="playercard.php">National Player Card</a></li></ul></li></ul> </div>
</div>
</nav>
 <section id="main" class="pt-3 mb-auto">
                <div class="container-fluid">
                    <div class="row">
                        <div class="d-none d-lg-block col-1 ps-0">
                            <div class="d-flex flex-column w-full overflow-hidden"> </div> </div> <div class="col-12 col-lg-10">
  <div class="d-flex flex-column"> <div class="btn-toolbar mb-4 mt-4 d-flex align-items-center"> 
<h5>Pairing of round 6</h5>
   	<div class="btn-group mx-5"> 
<?php include("pairing.js"); ?>
   	</div>
 </div>
<div class="table-responsive"><table class="table table-sm table-striped"> 
<thead><tr><th>Bo.</th><th>White Player</th><th>Pts</th><th>Result</th><th>Pts</th><th>Black Player</th></tr></thead><tbody>
<tr> <td>1</td><td><div class="player-container" 
   <div class="left-box2">
<a href="playercard.php#8"></a> 
 <div class="player-name-box2">
			<span>Wei,Andrew</span>
		</div> 
		<div class="player-data-box">
			<div class="sort-num"> 8</div> 
			<div class="title-box"> 
 <div class="notitle2 male">-</div>
			</div>
			<div class="rating">1031</div>
			<div class="fed"> <img style="border-radius: 4px; border:1px solid gray;" src="./flag/vic.png" alt="flag"></div>
		</div> 
	</div> 
</div>
</td><td>3</td><td class="result">1 - 0</td><td>2.5</td><td><div class="player-container" 
   <div class="left-box2">
<a href="playercard.php#7"></a> 
 <div class="player-name-box2">
			<span>Ashok,Arjun</span>
		</div> 
		<div class="player-data-box">
			<div class="sort-num"> 7</div> 
			<div class="title-box"> 
 <div class="notitle2 male">-</div>
			</div>
			<div class="rating">776</div>
			<div class="fed"> <img style="border-radius: 4px; border:1px solid gray;" src="./flag/vic.png" alt="flag"></div>
		</div> 
	</div> 
</div>
</td></tr>
<tr> <td>2</td><td><div class="player-container" 
   <div class="left-box2">
<a href="playercard.php#1"></a> 
 <div class="player-name-box2">
			<span>Morris,Elijah</span>
		</div> 
		<div class="player-data-box">
			<div class="sort-num"> 1</div> 
			<div class="title-box"> 
 <div class="notitle2 male">-</div>
			</div>
			<div class="rating">654</div>
			<div class="fed"> <img style="border-radius: 4px; border:1px solid gray;" src="./flag/vic.png" alt="flag"></div>
		</div> 
	</div> 
</div>
</td><td>2</td><td class="result">0 - 1</td><td>1.5</td><td><div class="player-container" 
   <div class="left-box2">
<a href="playercard.php#6"></a> 
 <div class="player-name-box2">
			<span>Majety,Rohan</span>
		</div> 
		<div class="player-data-box">
			<div class="sort-num"> 6</div> 
			<div class="title-box"> 
 <div class="notitle2 male">-</div>
			</div>
			<div class="rating">859</div>
			<div class="fed"> <img style="border-radius: 4px; border:1px solid gray;" src="./flag/vic.png" alt="flag"></div>
		</div> 
	</div> 
</div>
</td></tr>
<tr> <td>3</td><td><div class="player-container" 
   <div class="left-box2">
<a href="playercard.php#2"></a> 
 <div class="player-name-box2">
			<span>Bo,Jeremie</span>
		</div> 
		<div class="player-data-box">
			<div class="sort-num"> 2</div> 
			<div class="title-box"> 
 <div class="notitle2 male">-</div>
			</div>
			<div class="rating">753</div>
			<div class="fed"> <img style="border-radius: 4px; border:1px solid gray;" src="./flag/vic.png" alt="flag"></div>
		</div> 
	</div> 
</div>
</td><td>0</td><td class="result">1 - 0</td><td>3</td><td><div class="player-container" 
   <div class="left-box2">
<a href="playercard.php#5"></a> 
 <div class="player-name-box2">
			<span>Huang,Michael</span>
		</div> 
		<div class="player-data-box">
			<div class="sort-num"> 5</div> 
			<div class="title-box"> 
 <div class="notitle2 male">-</div>
			</div>
			<div class="rating">537</div>
			<div class="fed"> <img style="border-radius: 4px; border:1px solid gray;" src="./flag/vic.png" alt="flag"></div>
		</div> 
	</div> 
</div>
</td></tr>
<tr> <td>4</td><td><div class="player-container" 
   <div class="left-box2">
<a href="playercard.php#3"></a> 
 <div class="player-name-box2">
			<span>Nguyen,Anh Kiet</span>
		</div> 
		<div class="player-data-box">
			<div class="sort-num"> 3</div> 
			<div class="title-box"> 
 <div class="notitle2 male">-</div>
			</div>
			<div class="rating">1013</div>
			<div class="fed"> <img style="border-radius: 4px; border:1px solid gray;" src="./flag/vic.png" alt="flag"></div>
		</div> 
	</div> 
</div>
</td><td>5</td><td class="result">1 - 0</td><td>3</td><td><div class="player-container" 
   <div class="left-box2">
<a href="playercard.php#4"></a> 
 <div class="player-name-box2">
			<span>Ruaya,Rohan</span>
		</div> 
		<div class="player-data-box">
			<div class="sort-num"> 4</div> 
			<div class="title-box"> 
 <div class="notitle2 male">-</div>
			</div>
			<div class="rating">418</div>
			<div class="fed"> <img style="border-radius: 4px; border:1px solid gray;" src="./flag/vic.png" alt="flag"></div>
		</div> 
	</div> 
</div>
</td></tr>
</tbody>
</table>
</DIV><hr>
		  </div>
		      </div>
         <div class="d-none d-lg-block col-1 pe-0">
           <div class="d-flex flex-column w-full overflow-hidden">
   </div> </div>  </div>  </div> </section>
    <footer id="footer" class="bg-light py-5 mt-5 border-bottom border-light-subtle border-5">
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex flex-column align-items-center text-center text-dark"><p><a href="http://www.vegachess.com" target="_blank">Generated by Vega</a> All rights reserved</p><p>(Arbiter/Club : Casey Goh - AUS)
  <?php if (file_exists($_SERVER['DOCUMENT_ROOT'].'/siteprivacy.php')) include($_SERVER['DOCUMENT_ROOT'].'/siteprivacy.php'); ?>    </div>  </div>  </div> </div> 
   </footer>
     </div>
       <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script></body>
</html>