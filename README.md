# CS2 Killfeed Parser

This script uses following parser https://github.com/LaihoE/demoparser

In script there are 3 options:

1. Parse frags from demos

2. Get formatted frags for AE killfeed template script

3. Get players steamids

## 1) Parsing frags

Put demos in `demos` folder next to start.bat e.g.

```
Some folder
-- start.bat
-- dist
-- demos
   -- demo1.dem
   -- demo2.dem
```

Run start.bat and follow instructions.
You can select player by steamid, select which frags to include ,select which demos to parse

It will generate `.csv` file which is formatted with tabs. Means you can copy paste in to spreadsheet and everything will be in separte cells.

## 2) Get frags for killfeed template

You can provide demos data in following format

`demoname	tick-steamid-numberofkills`

Note that there's tab between demoname and frag info. If you copy it from spreadsheet it will be with tab already (ofc if demoname in different cell).

You can provide multiple frags in each demo and multiple demos e.g.

```
demoname1	tick-steamid-numberofkills,tick-steamid-numberofkills
demoname2	tick-steamid-numberofkills
```

Copy it and paste in terminal when prompted. Right click to paste.
Press enter to get on new line and then type `run` to parse demos.

It will generate `.csv` formatted with tabs, which you can paste to spreadsheet to use with AE killfeed template script.

## 3) Get steam ids

Same as previous, just follow instructions.

# After Effects Template with script

1. Check `allow scripts to write files` in `edit > preferences > scripting & expressions`, otherwise script won't work.

Detailed video tutorial:
TBD
