# CS2 Killfeed Thing

Basically this is the package for making CS2 killfeed. It contains demo parser script and After Effects template + script.

The parser script uses following parser https://github.com/LaihoE/demoparser

In order to use this package you'll need After Effects and [Node.js](https://nodejs.org/en/download/current) installed. Also Node.js has to be added to `PATH`.

If some demo doesnt get parsed, then probably demo is corrupted or something wrong with parser, which is unlikely. Nothing I can do about it.

Check video tutorial to understand how it all works: https://youtu.be/oeZ95yg7vN4

In script there are 4 options:

1. Parse frags from demos

2. Get formatted frags for AE killfeed template script

3. Get players steamids

4. Get in and out points

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

Provide starting index (optional).

Provide demos data in following format. You can copy paste output from first function for ease of use.

```
demoname    steamid    tick
demoname    steamid    tick
demoname    steamid    tick
```

Note that there's tab between demoname and frag info. If you copy it from spreadsheet it will be with tab already (ofc if values are in different cells). You can separate groups of kills by empty line.

Example:

```
faze-vs-g2-m1-inferno    76561197998926770    141134
faze-vs-g2-m1-inferno    76561197998926770    141282
faze-vs-g2-m1-inferno    76561197998926770    141373

faze-vs-g2-m2-ancient    76561198074762801    162312
faze-vs-g2-m2-ancient    76561198074762801    164096
faze-vs-g2-m2-ancient    76561198074762801    165597
```

Also note that one group = one demo. If multiple players provided they will get split into groups.

Otherwise separate into different groups (separate by empty line).

Use right click to paste in terminal.
When done press enter to get on new line and then type `run` and enter again to get killfeed data.

It will generate `.csv` formatted with tabs, which you can paste to spreadsheet to use with AE killfeed template script.

## 3) Get steam ids

Same as previous, just follow instructions. It will give you steam ids of players in selected demo.

## 4) Get in and out points

You have to provide timecodes in foloowing format:

```
timecode	description
timecode	description
timecode	description
```

Check video tutorial to understand how it works and why you may or may not need it.

# After Effects Killfeed Template with script

Video tutorial: https://youtu.be/oeZ95yg7vN4

1. Check `allow scripts to write files` in `edit > preferences > scripting & expressions`, otherwise script won't work.

2. Import `CS2-KIllfeed-v2.aep` into project.

3. Take out `CS2-KIllfeed` folder into root of your project.

4. Copy spreadsheet https://docs.google.com/spreadsheets/d/1BZdVUo386uld1ZBmGNzcN43C-Auky3VDCb6OVf8olA4/copy and fill out using provided example in there.

Important part to have `GROUP` indexes not duplicated and kills indexes as `1,2,3,4,5`. Then you have to validate weapons names. Take the cell from `Helper` sheet. You can either copy cell itself or copy it's validation thing. If you copy cell and start typing it will give you hints. If something doesnt work, then make sure you have United States locale selected in settings.

5. Export as csv and name as `killfeed` and `cuts` accordingly.

6. Import to root of project (`cuts` file is optional).

7. Run the script `file > scripts > run script`

8. If everything is done right, then you will see preview of `killfeed` content.

9. Select resolution, dont forget to save your project and click `render` button.

It will output files in `killfeed_resolution` folder next to your project. Since it's not actual render, but rather frame export, the progress bar doesnt reflect real-time export, so if you have a lot of these then you have to wait for all of them to appear and not to close After Effects before that.

10. Now you have killfeed as png images and you can stop here if that's enough for you. Next steps are optional.

11. If you provided correct timecodes in `killfeed.csv` then you can place on timeline. To do that you have to import pngs to to `killfeed_files` inside `CS2-KIllfeed` folder.

12. Create composition.

Important thing is to have same framerate as your project wherever from you exported timings. Otherwise they will not be placed correctly. Same goes for resolution. If you rendered `1080p` killfeed then you have to have `1080p` resolution. Otherwise you have to adjust it manually.

13. Select composition, run script and press place. If everything done correctly it will place killfeed pngs according to provided `killfeed.csv` with timecodes. It will also create mask for bg blur. Then you can put your footage underneath and you'll get killfeed with blur like it's done in game.

14. Same story goes for `cuts.csv`. It will essentially create keyframes on opacity property of both killfeed and it's blur layer.

If you dont want to render your footage with killfeed in After Effects you can export killfeed only with alpha channel. To do so just enable track matte for your footage layer and select the same layer that is selected for track matte of blur layer. Then copy opacity keyframes to your footage layer. This will preserve blurred background.

After that you should have only killfeed on transparent background, but with blurred content of your footage. Then just render it with alpha channel enabled.
