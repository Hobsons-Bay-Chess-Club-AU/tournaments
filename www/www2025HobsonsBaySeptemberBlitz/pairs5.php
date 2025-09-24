<!DOCTYPE html>
<html lang="en"><head> 
<meta charset="UTF-8">
<meta name="description" content="chess tournament">
<meta name="author" content="www.vegachess.com">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge"> 
<title>Hobsons Bay September Blitz</title>
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
<li><a class="dropdown-item" href="schedule.php"> Schedule </a></li><li><a class="dropdown-item" href="tourstat.php">Statistics</a></li> </ul></li><li class="nav-item dropdown">   <a class="nav-link" href="index.php" >Players</a>
</li><li class="nav-item"><a class="nav-link " href="pairs9.php" >Pairings</a>
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
                            <div class="flex flex-column justify-content-center text-center text-white">			<h1 class="mb-3" style="text-shadow: 2px 2px 4px #000000;" >Hobsons Bay September Blitz</h1>		    <h5 class="mb-1">Hobsons Bay September Blitz (AUS)</h5>		    <h5> 23/09/2025 - 23/09/2025</h5>   </div>
 </div> 
 </div>
 </div> 
 </section>
 <section id="main" class="pt-3 mb-auto">
                <div class="container-fluid">
                    <div class="row">
                        <div class="d-none d-lg-block col-1 ps-0">
                            <div class="d-flex flex-column w-full overflow-hidden"> </div> </div> <div class="col-12 col-lg-10">
  <div class="d-flex flex-column"> <div class="btn-toolbar mb-4 mt-4 d-flex align-items-center"> 
<h5>Pairing of round 5</h5>
   	<div class="btn-group mx-5"> 
<?php include("pairing.php"); ?>
   	</div>
 </div>
<div class="table-responsive"><table class="table table-sm table-striped"> 
<thead><tr><th>Bo.</th><th>Fed</th><th>White Player</th><th>Pts</th><th>Result</th><th>Pts</th><th>Black Player</th><th>Fed</th></tr></thead><tbody>
<tr> <td>1</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 9 </span><span class="notitle male"> </span> <a href="playercard.php#9"> Wei,Andrew</a> </td><td>4</td><td class="result">½ - ½</td><td>4</td><td class="name"><span class="idblack">4 </span><span class="notitle male"> </span> <a href="playercard.php#4"> Ramanathan,Ashwin</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>2</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 10 </span><span class="notitle male"> </span> <a href="playercard.php#10"> Nguyen,Tristan</a> </td><td>3</td><td class="result">0 - 1</td><td>3</td><td class="name"><span class="idblack">1 </span><span class="notitle male"> </span> <a href="playercard.php#1"> Nguyen,Anh Kiet</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>3</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 3 </span><span class="notitle male"> </span> <a href="playercard.php#3"> Bodke,Krishna</a> </td><td>3</td><td class="result">1 - 0</td><td>3</td><td class="name"><span class="idblack">13 </span><span class="notitle male"> </span> <a href="playercard.php#13"> Annadasu,Shreyansh</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>4</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 5 </span><span class="notitle male"> </span> <a href="playercard.php#5"> Paul,Cijo</a> </td><td>3</td><td class="result">1 - 0</td><td>3</td><td class="name"><span class="idblack">11 </span><span class="notitle male"> </span> <a href="playercard.php#11"> Nawar,Mena</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>5</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 14 </span><span class="notitle male"> </span> <a href="playercard.php#14"> Nguyen,Dinh An Quang</a> </td><td>3</td><td class="result">1 - 0</td><td>3</td><td class="name"><span class="idblack">6 </span><span class="notitle male"> </span> <a href="playercard.php#6"> Hogan,Steven</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>6</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 7 </span><span class="notitle male"> </span> <a href="playercard.php#7"> Yendru,Srikrishna</a> </td><td>3</td><td class="result">1 - 0</td><td>3</td><td class="name"><span class="idblack">39 </span><span class="notitle male"> </span> <a href="playercard.php#39"> Vemula,Thamoghna</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>7</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 17 </span><span class="notitle male"> </span> <a href="playercard.php#17"> Balaji,Sai Sivesh</a> </td><td>2.5</td><td class="result">1 - 0</td><td>2.5</td><td class="name"><span class="idblack">2 </span><span class="notitle male"> </span> <a href="playercard.php#2"> Picone,James</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>8</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 21 </span><span class="notitle female"> </span> <a href="playercard.php#21"> Fang,Candice</a> </td><td>2</td><td class="result">0 - 1</td><td>2</td><td class="name"><span class="idblack">15 </span><span class="notitle male"> </span> <a href="playercard.php#15"> Huang,Michael</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>9</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 16 </span><span class="notitle male"> </span> <a href="playercard.php#16"> Ngo,William</a> </td><td>2</td><td class="result">0 - 1</td><td>2</td><td class="name"><span class="idblack">23 </span><span class="notitle male"> </span> <a href="playercard.php#23"> Singh,Abhyuday</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>10</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 18 </span><span class="notitle male"> </span> <a href="playercard.php#18"> Nema,Nivaan</a> </td><td>2</td><td class="result">1 - 0</td><td>2</td><td class="name"><span class="idblack">27 </span><span class="notitle male"> </span> <a href="playercard.php#27"> Goh,Julian</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>11</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 24 </span><span class="notitle male"> </span> <a href="playercard.php#24"> Stefan Jiace Tham,Keanu</a> </td><td>2</td><td class="result">0 - 1</td><td>2</td><td class="name"><span class="idblack">19 </span><span class="notitle male"> </span> <a href="playercard.php#19"> Shaiek,Nihal</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>12</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 20 </span><span class="notitle male"> </span> <a href="playercard.php#20"> Goh,Nicholas</a> </td><td>2</td><td class="result">1 - 0</td><td>2</td><td class="name"><span class="idblack">36 </span><span class="notitle male"> </span> <a href="playercard.php#36"> Palta,Sameer</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>13</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 22 </span><span class="notitle female"> </span> <a href="playercard.php#22"> Husain,Lamiah</a> </td><td>1.5</td><td class="result">1 - 0</td><td>2</td><td class="name"><span class="idblack">40 </span><span class="notitle male"> </span> <a href="playercard.php#40"> Vignesh,Prajeeth Balaji</a></td><td><img class="shadow" src="flag/nzl.png" alt="NZL"></td></tr>
<tr> <td>14</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 31 </span><span class="notitle male"> </span> <a href="playercard.php#31"> Jyothi Nikhil,Neev</a> </td><td>1.5</td><td class="result">1 - 0</td><td>1</td><td class="name"><span class="idblack">26 </span><span class="notitle male"> </span> <a href="playercard.php#26"> Yendru,Sriram</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>15</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 30 </span><span class="notitle male"> </span> <a href="playercard.php#30"> Bhatia,Gaurav</a> </td><td>1</td><td class="result">0 - 1</td><td>1</td><td class="name"><span class="idblack">8 </span><span class="notitle male"> </span> <a href="playercard.php#8"> Goh,Casey</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>16</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 35 </span><span class="notitle male"> </span> <a href="playercard.php#35"> Mc kay,Peter</a> </td><td>1</td><td class="result">0 - 1</td><td>1</td><td class="name"><span class="idblack">12 </span><span class="notitle male"> </span> <a href="playercard.php#12"> Jamie,R Martin</a></td><td><img class="shadow" src="flag/aus.png" alt="AUS"></td></tr>
<tr> <td>17</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 38 </span><span class="notitle male"> </span> <a href="playercard.php#38"> Sheikh,Tahmid</a> </td><td>1</td><td class="result">0 - 1</td><td>1</td><td class="name"><span class="idblack">25 </span><span class="notitle male"> </span> <a href="playercard.php#25"> Balamurugan,Soorya</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>18</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 28 </span><span class="notitle female"> </span> <a href="playercard.php#28"> Goh,Daphne</a> </td><td>1</td><td class="result">1 - 0</td><td>1</td><td class="name"><span class="idblack">37 </span><span class="notitle male"> </span> <a href="playercard.php#37"> Rod,Carlyle</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>19</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 32 </span><span class="notitle male"> </span> <a href="playercard.php#32"> Jyothi Nikhil,Vihaan</a> </td><td>1</td><td class="result">1 - 0</td><td>0</td><td class="name"><span class="idblack">33 </span><span class="notitle male"> </span> <a href="playercard.php#33"> Kantharaju,Aryan</a></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>20</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 34 </span><span class="notitle male"> </span> <a href="playercard.php#34"> Krishanth,Vigneshwar</a> </td><td>0</td><td class="result">1    </td><td>0</td><td class="name">( bye )</td><td></td></tr>
<tr> <td>21</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td class="name"> <span class="idwhite"> 29 </span><span class="notitle female"> </span> <a href="playercard.php#29"> Barar,Ridam</a> </td><td>0</td><td class="result">0    </td><td>0</td><td class="name">( not paired )</td><td></td></tr>
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
                        <div class="d-flex flex-column align-items-center text-center text-dark"><p><a href="http://www.vegachess.com" target="_blank">Generated by Vega</a> All rights reserved</p><p>(Arbiter/Club : Hobsons Bay Chess Club - AUS)
  <?php if (file_exists($_SERVER['DOCUMENT_ROOT'].'/siteprivacy.php')) include($_SERVER['DOCUMENT_ROOT'].'/siteprivacy.php'); ?>    </div>  </div>  </div> </div> 
   </footer>
     </div>
       <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script></body>
</html>