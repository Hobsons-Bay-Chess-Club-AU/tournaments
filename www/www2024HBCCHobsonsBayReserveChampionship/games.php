<!DOCTYPE html>
<html lang="en"><head> 
<meta charset="UTF-8">
<meta name="description" content="chess tournament">
<meta name="author" content="www.vegachess.com">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge"> 
<title>2024 HBCC Hobsons Bay Reserve Championship</title>
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
<ul class="dropdown-menu"><li><a class="dropdown-item" href="index.php">Sorted by Rating</a></li><li><a class="dropdown-item" href="playersname.php">Sorted by Name</a></li></ul></li><li class="nav-item"><a class="nav-link " href="pairs5.php" >Pairings</a>
</li><li class="nav-item"><a class="nav-link" href="standings.php" >Standings</a>
</li><li class="nav-item dropdown">   <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Tables</a>
<ul class="dropdown-menu"><li><a class="dropdown-item" href="crosstable.php"> Cross table </a></li><li><a class="dropdown-item" href="crosstablescore.php"> Cross table and standings </a></li><li><a class="dropdown-item" href="rankinggroup.php"> Standings by Rtg groups </a></li><li><a class="dropdown-item" href="rankingagegroup.php"> Standings by age groups </a></li><li><a class="dropdown-item" href="rankcat.php"> Standings by title </a></li><li><a class="dropdown-item" href="rankTeams.php"> Rank Teams </a></li><li><a class="dropdown-item" href="summaryFederations.php"> Summary Federations </a></li><li><a class="dropdown-item" href="summaryOrigin.php"> Summary Origin </a></li></ul></li><li class="nav-item dropdown">   <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Reports</a>
<ul class="dropdown-menu">          <li><a class="dropdown-item" href="felovar.php">FIDE Rating</a></li>          <li><a class="dropdown-item" href="fideplayercard.php">FIDE Player Card</a></li>           <li><a class="dropdown-item" href="nelovar.php">National rating</a></li>          <li><a class="dropdown-item" href="playercard.php">National Player Card</a></li></ul></li></ul> </div>
</div>
</nav>
 <section id="hero" class="d-flex align-items-center">
                <div class="container-fluid">
                    <div class="row items-center">
                        <div class="col-12">
                            <div class="flex flex-column justify-content-center text-center text-white">			<h1 class="mb-3" style="text-shadow: 2px 2px 4px #000000;" >2024 HBCC Hobsons Bay Reserve Championship</h1>		    <h5 class="mb-1">Hobsons Bay Chess Club (AUS)</h5>		    <h5> 08/10/2024 - 03/12/2024</h5>   </div>
 </div> 
 </div>
 </div> 
 </section>
 <section id="main" class="pt-3 mb-auto">
                <div class="container-fluid">
                    <div class="row">
                        <div class="d-none d-lg-block col-1 ps-0">
                            <div class="d-flex flex-column w-full overflow-hidden"> </div> </div> <div class="col-12 col-lg-10">
  <div class="d-flex flex-column"><div><script type="text/javascript" src="game.js"></script> </div>
<input type="hidden" id="viewerpath" value="/vega.html">
<input type="hidden" id="gamepath" value="">
<input type="hidden" id="gamename" value="2024 HBCC Hobsons Bay Reserve Championship">
<iframe id="myframe" align=center src="http:///vega.html?pgnFile=/2024 HBCC Hobsons Bay Reserve Championship5.pgn"  width=430 height=680 frameborder=0></iframe>		  </div>
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