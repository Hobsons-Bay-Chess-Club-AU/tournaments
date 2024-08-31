<!DOCTYPE html>
<html lang="en"><head> 
<meta charset="UTF-8">
<meta name="description" content="chess tournament">
<meta name="author" content="www.vegachess.com">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge"> 
<title>Best In The West 2024</title>
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
<ul class="dropdown-menu"><li><a class="dropdown-item" href="index.php">Sorted by Rating</a></li><li><a class="dropdown-item" href="playersname.php">Sorted by Name</a></li></ul></li><li class="nav-item"><a class="nav-link " href="pairs2.php" >Pairings</a>
</li><li class="nav-item"><a class="nav-link" href="standings.php" >Standings</a>
</li><li class="nav-item dropdown">   <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Tables</a>
<ul class="dropdown-menu"><li><a class="dropdown-item" href="crosstable.php"> Cross table </a></li><li><a class="dropdown-item" href="crosstablescore.php"> Cross table and standings </a></li><li><a class="dropdown-item" href="rankinggroup.php"> Standings by Rtg groups </a></li><li><a class="dropdown-item" href="rankingagegroup.php"> Standings by age groups </a></li><li><a class="dropdown-item" href="rankcat.php"> Standings by title </a></li><li><a class="dropdown-item" href="rankTeams.php"> Rank Teams </a></li><li><a class="dropdown-item" href="summaryFederations.php"> Summary Federations </a></li><li><a class="dropdown-item" href="summaryOrigin.php"> Summary Origin </a></li></ul></li><li class="nav-item dropdown">   <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Reports</a>
<ul class="dropdown-menu">          <li><a class="dropdown-item" href="felovar.php">FIDE Rating</a></li>          <li><a class="dropdown-item" href="fideplayercard.php">FIDE Player Card</a></li>           <li><a class="dropdown-item" href="nelovar.php">National rating</a></li>          <li><a class="dropdown-item" href="playercard.php">National Player Card</a></li></ul></li></ul> </div>
</div>
</nav>
 <section id="main" class="pt-3 mb-auto">
                <div class="container-fluid">
                    <div class="row">
                        <div class="d-none d-lg-block col-1 ps-0">
                            <div class="d-flex flex-column w-full overflow-hidden"> </div> </div> <div class="col-12 col-lg-10">
  <div class="d-flex flex-column"> <div class="btn-toolbar mb-4 mt-4 d-flex align-items-center"> 
<h5>Pairing of round 2</h5>
   	<div class="btn-group mx-5"> 
<?php include("pairing.js"); ?>
   	</div>
 </div>
<div class="table-responsive"><table class="table table-sm table-striped"> 
<thead><tr><th>Bo.</th><th>Fed</th><th>Origin</th><th>White Player</th><th>Pts</th><th>Result</th><th>Pts</th><th>Black Player</th><th>Origin</th><th>Fed</th></tr></thead><tbody>
<tr> <td>1</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 23 </span><span class="notitle male"> </span> <a href="playercard.php#23"> Whitford,Matthew</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">1 </span><span class="title male"> IM</span> <a href="playercard.php#1"> Morris,James</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>2</td><td><img class="shadow" src="flag/os.png" alt="OS"></td><td></td><td class="name"> <span class="idwhite"> 2 </span><span class="title male"> FM</span> <a href="playercard.php#2"> Gong,Daniel Hanwen</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">22 </span><span class="notitle male"> </span> <a href="playercard.php#22"> Ilic,Goran</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>3</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 25 </span><span class="notitle male"> </span> <a href="playercard.php#25"> Paul,Cijo</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">3 </span><span class="title male"> FM</span> <a href="playercard.php#3"> Dragicevic,Domagoj</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>4</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 4 </span><span class="title male"> FM</span> <a href="playercard.php#4"> Bassig,Hamish</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">26 </span><span class="notitle male"> </span> <a href="playercard.php#26"> Hill,James</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>5</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 27 </span><span class="notitle male"> </span> <a href="playercard.php#27"> Cheema,Mohammad</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">5 </span><span class="notitle male"> </span> <a href="playercard.php#5"> Gill,Geoffrey</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>6</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 6 </span><span class="title male"> CM</span> <a href="playercard.php#6"> Annapureddy,Rheyansh Reddy</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">29 </span><span class="notitle male"> </span> <a href="playercard.php#29"> Picone,James</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>7</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 8 </span><span class="notitle male"> </span> <a href="playercard.php#8"> Milojevic,Miodrag</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">31 </span><span class="notitle male"> </span> <a href="playercard.php#31"> Hogan,Steven</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>8</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 35 </span><span class="notitle male"> </span> <a href="playercard.php#35"> Lingineni,Khushal</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">9 </span><span class="notitle male"> </span> <a href="playercard.php#9"> Lojanica,Milenko</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>9</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 10 </span><span class="notitle male"> </span> <a href="playercard.php#10"> Poberezovsky,Daniel</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">34 </span><span class="notitle male"> </span> <a href="playercard.php#34"> Brockman,Roland</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>10</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 37 </span><span class="notitle male"> </span> <a href="playercard.php#37"> Cauchi,John-Paul</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">12 </span><span class="notitle male"> </span> <a href="playercard.php#12"> Hogg,Dean</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>11</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 13 </span><span class="title male"> CM</span> <a href="playercard.php#13"> Davis,Tony J</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">38 </span><span class="notitle male"> </span> <a href="playercard.php#38"> Nowak,Ruben</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>12</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 39 </span><span class="notitle female"> </span> <a href="playercard.php#39"> Davis,Sophie</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">14 </span><span class="notitle male"> </span> <a href="playercard.php#14"> Lim,Zacharias</a></td><td></td><td><img class="shadow" src="flag/tas.png" alt="TAS"></td></tr>
<tr> <td>13</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 15 </span><span class="notitle male"> </span> <a href="playercard.php#15"> Smith,Jack</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">40 </span><span class="notitle male"> </span> <a href="playercard.php#40"> Hari,Dhruv</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>14</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 43 </span><span class="notitle male"> </span> <a href="playercard.php#43"> Wilford,Harry</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">16 </span><span class="notitle male"> </span> <a href="playercard.php#16"> Daneshvar,Reza</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>15</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 51 </span><span class="notitle male"> </span> <a href="playercard.php#51"> Li,LiYuan</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">18 </span><span class="title female"> WFM</span> <a href="playercard.php#18"> Chibnall,Alana</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>16</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 19 </span><span class="notitle male"> </span> <a href="playercard.php#19"> Lacson,Joemar</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">41 </span><span class="notitle male"> </span> <a href="playercard.php#41"> Escobar,David</a></td><td></td><td><img class="shadow" src="flag/tas.png" alt="TAS"></td></tr>
<tr> <td>17</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 71 </span><span class="notitle male"> </span> <a href="playercard.php#71"> Bhanot,Laksh</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">20 </span><span class="notitle female"> </span> <a href="playercard.php#20"> Song,Anya</a></td><td></td><td><img class="shadow" src="flag/tas.png" alt="TAS"></td></tr>
<tr> <td>18</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 21 </span><span class="notitle male"> </span> <a href="playercard.php#21"> Althaf,Rifky</a> </td><td>1</td><td class="result"> ... </td><td>1</td><td class="name"><span class="idblack">42 </span><span class="notitle female"> </span> <a href="playercard.php#42"> Widjaja,Ashton</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>19</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 75 </span><span class="notitle male"> </span> <a href="playercard.php#75"> Hua,Zhenghao</a> </td><td>1</td><td class="result"> ... </td><td>0.5</td><td class="name"><span class="idblack">11 </span><span class="notitle male"> </span> <a href="playercard.php#11"> Nguyen,Gia Huy (Tony)</a></td><td></td><td><img class="shadow" src="flag/os.png" alt="OS"></td></tr>
<tr> <td>20</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 17 </span><span class="notitle male"> </span> <a href="playercard.php#17"> Sicat,Rodel</a> </td><td>0.5</td><td class="result"> ... </td><td>0.5</td><td class="name"><span class="idblack">47 </span><span class="notitle male"> </span> <a href="playercard.php#47"> Matijas,Dejan</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>21</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 73 </span><span class="notitle male"> </span> <a href="playercard.php#73"> Fan,Xinyao</a> </td><td>0.5</td><td class="result"> ... </td><td>0.5</td><td class="name"><span class="idblack">24 </span><span class="notitle male"> </span> <a href="playercard.php#24"> Tsagarakis,Angelo</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>22</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 79 </span><span class="notitle male"> </span> <a href="playercard.php#79"> Li,Harry</a> </td><td>0.5</td><td class="result"> ... </td><td>0.5</td><td class="name"><span class="idblack">30 </span><span class="notitle male"> </span> <a href="playercard.php#30"> Humphreys,Scott</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>23</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 67 </span><span class="notitle male"> </span> <a href="playercard.php#67"> Saha,Avinandan (Arjun)</a> </td><td>0.5</td><td class="result"> ... </td><td>0.5</td><td class="name"><span class="idblack">36 </span><span class="notitle male"> </span> <a href="playercard.php#36"> Ilic,Milan</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>24</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 7 </span><span class="title male"> CM</span> <a href="playercard.php#7"> Hartley,James</a> </td><td>0</td><td class="result"> ... </td><td>0.5</td><td class="name"><span class="idblack">60 </span><span class="notitle male"> </span> <a href="playercard.php#60"> Annadasu,Shreyansh</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>25</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 63 </span><span class="notitle female"> </span> <a href="playercard.php#63"> Santoso,Crystin</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">28 </span><span class="notitle male"> </span> <a href="playercard.php#28"> Tanner,Jonathan</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>26</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 64 </span><span class="notitle male"> </span> <a href="playercard.php#64"> Nicdao,Joseph</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">32 </span><span class="notitle male"> </span> <a href="playercard.php#32"> Juszczynski,Mathew</a></td><td></td><td><img class="shadow" src="flag/sa.png" alt="SA"></td></tr>
<tr> <td>27</td><td><img class="shadow" src="flag/os.png" alt="OS"></td><td></td><td class="name"> <span class="idwhite"> 33 </span><span class="notitle male"> </span> <a href="playercard.php#33"> Nguyen,Tristan</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">66 </span><span class="notitle male"> </span> <a href="playercard.php#66"> Batyrbekov,Aidan</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>28</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 44 </span><span class="notitle male"> </span> <a href="playercard.php#44"> Corbeil,Serge</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">68 </span><span class="notitle male"> </span> <a href="playercard.php#68"> Ruaya,Rohan</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>29</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 65 </span><span class="notitle male"> </span> <a href="playercard.php#65"> Batyrbekov,Kaisar</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">45 </span><span class="notitle male"> </span> <a href="playercard.php#45"> Nguyen,Anh Kiet</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>30</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 46 </span><span class="notitle male"> </span> <a href="playercard.php#46"> Yendru,Srikrishna</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">70 </span><span class="notitle male"> </span> <a href="playercard.php#70"> Balaji,Sai Sivesh</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>31</td><td><img class="shadow" src="flag/os.png" alt="OS"></td><td></td><td class="name"> <span class="idwhite"> 69 </span><span class="notitle male"> </span> <a href="playercard.php#69"> Ahmad,Ihtiram</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">48 </span><span class="notitle male"> </span> <a href="playercard.php#48"> Bodke,Krishna</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>32</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 49 </span><span class="notitle male"> </span> <a href="playercard.php#49"> Wilkinson,Greg</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">72 </span><span class="notitle male"> </span> <a href="playercard.php#72"> Ennis-King,Rowan</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>33</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 74 </span><span class="notitle male"> </span> <a href="playercard.php#74"> Ghosh,Rishan</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">50 </span><span class="notitle male"> </span> <a href="playercard.php#50"> Ramanathan,Ashwin</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>34</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 77 </span><span class="notitle male"> </span> <a href="playercard.php#77"> Jagannathan,Shashvath</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">52 </span><span class="notitle male"> </span> <a href="playercard.php#52"> Hu,Tony</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>35</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 53 </span><span class="notitle female"> </span> <a href="playercard.php#53"> Yates,Anna</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">78 </span><span class="notitle male"> </span> <a href="playercard.php#78"> Kansal,Nuwan</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>36</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 81 </span><span class="notitle male"> </span> <a href="playercard.php#81"> Nguyen,Tuan Kiet</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">54 </span><span class="notitle male"> </span> <a href="playercard.php#54"> Prince,Alan</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>37</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 55 </span><span class="notitle male"> </span> <a href="playercard.php#55"> Tsai,Darren</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">80 </span><span class="notitle male"> </span> <a href="playercard.php#80"> Ngo,William</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>38</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 83 </span><span class="notitle male"> </span> <a href="playercard.php#83"> Singh,Abhyuday</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">56 </span><span class="notitle male"> </span> <a href="playercard.php#56"> Musson,Henry</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>39</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 59 </span><span class="notitle female"> </span> <a href="playercard.php#59"> Guha,Shanaya</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">82 </span><span class="notitle female"> </span> <a href="playercard.php#82"> Scenna, Luna</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>40</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 61 </span><span class="notitle male"> </span> <a href="playercard.php#61"> Parker,Lucas</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">86 </span><span class="notitle male"> </span> <a href="playercard.php#86"> Yang,Yifan</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>41</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 85 </span><span class="notitle female"> </span> <a href="playercard.php#85"> Widjaja,Aurora</a> </td><td>0</td><td class="result"> ... </td><td>0</td><td class="name"><span class="idblack">62 </span><span class="notitle male"> </span> <a href="playercard.php#62"> Nawar,Mena</a></td><td></td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td></tr>
<tr> <td>42</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 58 </span><span class="notitle male"> </span> <a href="playercard.php#58"> Thompson,Selby</a> </td><td>0</td><td class="result">½    </td><td>0</td><td class="name">( half point bye )</td><td></td><td></td></tr>
<tr> <td>43</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 57 </span><span class="notitle male"> </span> <a href="playercard.php#57"> Vincent,Lucas</a> </td><td>0</td><td class="result">0    </td><td>0</td><td class="name">( not paired )</td><td></td><td></td></tr>
<tr> <td>44</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 76 </span><span class="notitle female"> </span> <a href="playercard.php#76"> Husain,Lamiah</a> </td><td>0</td><td class="result">0    </td><td>0</td><td class="name">( not paired )</td><td></td><td></td></tr>
<tr> <td>45</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 84 </span><span class="notitle male"> </span> <a href="playercard.php#84"> Singh,Anvay</a> </td><td>0</td><td class="result">0    </td><td>0</td><td class="name">( not paired )</td><td></td><td></td></tr>
<tr> <td>46</td><td><img class="shadow" src="flag/vic.png" alt="VIC"></td><td></td><td class="name"> <span class="idwhite"> 87 </span><span class="notitle male"> </span> <a href="playercard.php#87"> Parker,Brett</a> </td><td>0</td><td class="result">0    </td><td>0</td><td class="name">( not paired )</td><td></td><td></td></tr>
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