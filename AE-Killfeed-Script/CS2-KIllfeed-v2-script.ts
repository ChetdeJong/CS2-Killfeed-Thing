const version = '2.4.0';

declare class WindowExtended extends Window {
	update(): void;
}
declare class LayerExtended extends Layer {
	essentialProperty(name: string): AnyProperty;
}

const weapons = [
	'glock',
	'usp_silencer_off',
	'usp_silencer',
	'hkp2000',
	'p250',
	'elite',
	'cz75a',
	'tec9',
	'fiveseven',
	'deagle',
	'revolver',
	'galilar',
	'famas',
	'ak47',
	'm4a1_silencer_off',
	'm4a1_silencer',
	'm4a1',
	'sg556',
	'aug',
	'awp',
	'ssg08',
	'g3sg1',
	'scar20',
	'ump45',
	'bizon',
	'mac10',
	'mp5sd',
	'mp7',
	'mp9',
	'p90',
	'sawedoff',
	'xm1014',
	'nova',
	'mag7',
	'm249',
	'negev',
	'hegrenade',
	'inferno',
	'decoy',
	'flashbang',
	'incgrenade',
	'molotov',
	'smokegrenade',
	'taser',
	'bayonet',
	'knifegg',
	'knife_widowmaker',
	'knife_ursus',
	'knife_tactical',
	'knife_t',
	'knife_survival_bowie',
	'knife_cord',
	'knife_css',
	'knife_falchion',
	'knife_flip',
	'knife_gut',
	'knife_gypsy_jackknife',
	'knife_karambit',
	'knife_kukri',
	'knife_m9_bayonet',
	'knife_outdoor',
	'knife_push',
	'knife_skeleton',
	'knife_stiletto',
	'knife_canis',
	'knife_butterfly',
	'knife_bowie',
	'knife',
	'knife_twinblade'
];

function readCSV(file): string {
	file.open('r');
	const data = file.read();
	file.close();
	return data;
}

interface row {
	name: string;
	index: string;
	attacker_side: string;
	attacker: string;
	victim_side: string;
	victim: string;
	weapon: string;
	headshot: string;
	wallbang: string;
	noscope: string;
	smoke: string;
	blind: string;
	inair: string
	frame: string | undefined;
}

function findIndex(arr: string[], target: string) {
	var index = -1;
	for (let i = 0; i < arr.length; i++) {
		if (arr[i] === target) {
			index = i;
			break;
		}
	}
	return index;
}

function setDeathnotice(comp: CompItem, row: row) {
	const layer = comp.layer(row.index);
	const layer_mask = comp.layer(`${row.index}_mask`);
	setLayerProperties(layer as LayerExtended, row);
	setLayerProperties(layer_mask as LayerExtended, row);
	layer.enabled = true;
	saveDeathnotice(comp, row.name);
}

function resetDeathnotices(comp: CompItem) {
	for (let i = 1; i < 11; i++) {
		const layer = comp.layer(i.toString());
		layer.enabled = false;
	}
}

function setLayerProperties(layer: LayerExtended, row: row) {
	layer.essentialProperty('Attacker name').setValue(row.attacker);
	layer.essentialProperty('Victim name').setValue(row.victim);
	layer.essentialProperty('Attacker color').setValue(row.attacker_side);
	layer.essentialProperty('Victim color').setValue(row.victim_side);
	layer.essentialProperty('Weapon').setValue(row.weapon);
	layer.essentialProperty('headshot').setValue(row.headshot);
	layer.essentialProperty('wallbang').setValue(row.wallbang);
	layer.essentialProperty('noscope').setValue(row.noscope);
	layer.essentialProperty('smoke-kill').setValue(row.smoke);
	layer.essentialProperty('blind').setValue(row.blind);
	layer.essentialProperty('inair').setValue(row.inair);
}

function saveDeathnotice(comp: CompItem, name) {
	const outfolder = new Folder(`${app.project.file.path}/killfeed_${comp.name}`);
	if (!outfolder.exists) outfolder.create();
	comp.saveFrameToPng(2, File(`${outfolder}/${name}.png`));
}

function map(array, callback) {
	var result = [];
	for (var i = 0; i < array.length; i++) {
		result.push(callback(array[i], i, array));
	}
	return result;
}

function getFrames(timecode: string, fps: number) {
	try {
		const time = timecode.replace('.', ':');

		const timeArray = time.split(':');

		if (timeArray.length !== 4) return null;
		let frames = Number(timeArray[3]);

		if (Number(timeArray[0]) !== 0) frames = frames + Number(timeArray[0]) * 60 * 60 * fps;
		if (Number(timeArray[1]) !== 0) frames = frames + Number(timeArray[1]) * 60 * fps;
		if (Number(timeArray[2]) !== 0) frames = frames + Number(timeArray[2]) * fps;

		if (isNaN(frames)) throw new Error('Cant parse frames');

		return frames;
	} catch (error) {
		return null;
	}
}

function logger(logData: string, alertMessage: string) {
	const date = new Date();
	const current_date = `Date: ${date.toDateString()} Time: ${date.toTimeString()}`;
	const logs = new File(`${app.project.file.path}/logs.txt`);
	logs.open('w');
	logs.write(`Logs date ${current_date}\n` + logData);
	logs.close();

	alert(alertMessage);
}

function mainEntry() {
	try {
		let skippedLines: string[] = [];
		function processDeathnotices(data, comp: CompItem) {
			try {
				skippedLines = [];
				const rows: string[] = data.split('\n');
				const increment = 100 / rows.length;
				progressbar1.value += increment;
				let filename = '';
				for (let i = 1; i < rows.length; i++) {
					progressbar1.value += increment;
					win.update();
					const row = rows[i].split(',');
					if (!row || !row[0] || !row[1] || row[0] === '' || row[1] === '') {
						throw new Error(
							`Missing GROUP prefix or GROUP index or kill index\nline:\n${row.join(
								', '
							)}\nAborting render...`
						);
					}
					if (row[0] === 'GROUP') {
						filename =
							row[2] == '' || row[2] == undefined ? row[1] : `${row[1]}_${row[2]}`;
						resetDeathnotices(comp);
						continue;
					}
					if (Number(row[0]) < 1 || Number(row[0]) > 10) continue;
					const isEmpty = [];
					for (let j = 1; j < row.length - 1; j++) {
						if (!row[j] || row[j] === '' || row[j] === undefined) isEmpty.push(j);
					}
					if (isEmpty.length > 0) {
						skippedLines.push('Incomplete line:\n' + row.join(', '));
						continue;
					}

					const weaponIndex = findIndex(weapons, row[5]);
					if (weaponIndex === -1) {
						skippedLines.push('Unknown weapon:\n' + row.join(', '));
						continue;
					}

					const rowObj: row = {
						name: `${filename}_${row[0]}`,
						index: row[0],
						attacker_side: row[1] === 'T' ? '1' : '2',
						attacker: row[2],
						victim_side: row[3] === 'T' ? '1' : '2',
						victim: row[4],
						weapon: (weaponIndex + 1).toString(),
						headshot: row[6] === 'TRUE' ? '1' : '0',
						wallbang: row[7] === 'TRUE' ? '1' : '0',
						noscope: row[8] === 'TRUE' ? '1' : '0',
						smoke: row[9] === 'TRUE' ? '1' : '0',
						blind: row[10] === 'TRUE' ? '1' : '0',
						inair: row[11] === 'TRUE' ? '1' : '0',
						frame: row[12]
					};
					setDeathnotice(comp, rowObj);
				}
				if (skippedLines.length > 0) {
					logger(
						`Skipped lines:\n\n${skippedLines.join('\n\n')}`,
						'Few lines were skipped, probably some typo or missing (wrong) data\nCheck logs.txt file, which is located next to project file.'
					);
				}
			} catch (error) {
				if (error instanceof Error) {
					logger(
						'Render function error:\n' +
							`${error.description}\n` +
							`${error.toString()}\n` +
							error.toSource(),
						'Uncaught error in Render function\nCheck log.txt which is located next to project file.'
					);
				} else {
					alert(error);
				}
			}
		}

		const win = new Window('dialog', `CS2 Killfeed Script v${version}`, undefined, {
			resizeable: false,
			closeButton: false
		}) as WindowExtended;

		win.preferredSize.width = 400;
		win.preferredSize.height = 300;
		win.orientation = 'column';
		win.alignChildren = 'center';
		win.spacing = 10;
		win.margins = 16;

		// MAIN
		// ====
		var main: Group = win.add('group', undefined, { name: 'main' });
		main.preferredSize.width = 400;
		main.orientation = 'column';
		main.alignChildren = 'fill';
		main.spacing = 10;
		main.margins = 0;

		var progressbar1: Progressbar = main.add(
			'progressbar' as 'treeview',
			undefined,
			undefined,
			{
				name: 'progressbar1'
			}
		) as any;
		progressbar1.maxvalue = 100;
		progressbar1.value = 0;
		progressbar1.preferredSize.width = 400;
		progressbar1.preferredSize.height = 15;
		// progressbar1.visible = false;

		// TOP
		// ===
		var top = main.add('group', undefined, { name: 'top' });
		top.orientation = 'row';
		top.alignChildren = ['center', 'center'];
		top.spacing = 10;
		top.margins = 0;

		var restext = top.add('statictext', undefined, undefined, { name: 'restext' });
		restext.text = 'Resolution';

		var res_array = ['1080p', '1440p', '2160p'];
		var res = top.add('dropdownlist', undefined, undefined, { name: 'res', items: res_array });
		res.selection = 1;
		res.preferredSize.width = 100;

		var renderbtn = top.add('button', undefined, 'Render', { name: 'renderbtn' });

		var placebtn = top.add('button', undefined, 'Place', { name: 'placebtn' });

		var cutsbtn = top.add('button', undefined, 'Do cuts', { name: 'cutsbtn' });

		var cancel = top.add('button', undefined, 'Quit', { name: 'cancel' });

		// MAIN
		// ====
		var divider1 = main.add('panel', undefined, undefined, { name: 'divider1' });
		divider1.alignment = 'fill';

		// WIN
		// ===

		var tpanel1 = main.add('tabbedpanel', undefined, undefined, {
			name: 'tpanel1'
		}) as TabbedPanel & { alignChildren: string; margins: number };
		tpanel1.alignChildren = 'fill';
		tpanel1.margins = 0;

		var tab1 = tpanel1.add('tab', undefined, undefined, { name: 'tab1' });
		tab1.text = 'Frags';
		tab1.orientation = 'column';
		tab1.spacing = 10;
		tab1.margins = 10;
		tab1.alignChildren = 'fill';

		var tab2 = tpanel1.add('tab', undefined, undefined, { name: 'tab2' });
		tab2.text = 'Cuts';
		tab2.orientation = 'column';
		tab2.spacing = 10;
		tab2.margins = 10;
		tab2.alignChildren = 'fill';

		var table = tab1.add('listbox', undefined, [], {
			name: 'table',
			numberOfColumns: 4
		});
		// table.preferredSize.width = 400;
		table.maximumSize.height = 300;
		table.active = false;
		table.alignment = 'fill';

		var tableCuts = tab2.add('listbox', undefined, [], {
			name: 'table',
			numberOfColumns: 2,
			showHeaders: true,
			columnTitles: ['In', 'Out']
		});
		// table.preferredSize.width = 400;
		tableCuts.preferredSize.height = 300;
		tableCuts.active = false;
		tableCuts.alignment = 'fill';

		let csv, comp_1080p, comp_1440p, comp_2160p, killfeedfolder;

		function getCuts() {
			for (let i = 1; i < app.project.rootFolder.numItems + 1; i++) {
				let item = app.project.rootFolder.item(i);
				if (item instanceof FootageItem && item.name === 'cuts.csv') {
					return new File(item.file.toString());
				}
			}
			return null;
		}

		tpanel1.onChange = function () {
			if (
				tpanel1.selection == null ||
				(tpanel1.selection as any).text == null ||
				(tpanel1.selection as any).text == 'Frags'
			)
				return;

			const cuts = getCuts();

			if (!cuts) {
				alert('cuts.csv not found');
				return;
			}

			tableCuts.removeAll();

			const data = readCSV(cuts);
			const rows: string[] = data.split('\n');

			for (let i = 1; i < rows.length; i++) {
				const row = rows[i].split(',');
				const item = tableCuts.add('item', row[0]);
				item.subItems[0].text = row[1];
			}
		};

		for (let i = 1; i < app.project.rootFolder.numItems + 1; i++) {
			let item = app.project.rootFolder.item(i);
			if (item instanceof FootageItem && item.name === 'killfeed.csv') {
				csv = new File(item.file.toString());
				break;
			}
		}
		if (!csv) {
			alert('killfeed.csv not found');
			win.close();
		}

		for (let i = 1; i < app.project.rootFolder.numItems + 1; i++) {
			let item = app.project.rootFolder.item(i);
			if (item instanceof FolderItem && item.name === 'CS2-Killfeed') {
				killfeedfolder = item;
				break;
			}
		}
		if (!killfeedfolder) {
			alert('project folder not found, should be CS2-Killfeed');
			win.close();
		}

		for (let i = 1; i < killfeedfolder.numItems + 1; i++) {
			if (
				killfeedfolder.item(i) instanceof CompItem &&
				killfeedfolder.item(i).name === '1920x1080'
			) {
				comp_1080p = killfeedfolder.item(i);
			}
			if (
				killfeedfolder.item(i) instanceof CompItem &&
				killfeedfolder.item(i).name === '2560x1440'
			) {
				comp_1440p = killfeedfolder.item(i);
			}
			if (
				killfeedfolder.item(i) instanceof CompItem &&
				killfeedfolder.item(i).name === '3840x2160'
			) {
				comp_2160p = killfeedfolder.item(i);
			}
		}

		if (!comp_1080p) {
			alert('1920x1080 comp not found');
			win.close();
		}

		if (!comp_1440p) {
			alert('2560x1440 comp not found');
			win.close();
		}

		if (!comp_2160p) {
			alert('3840x2160 comp not found');
			win.close();
		}

		const data = readCSV(csv);
		const rows: string[] = data.split('\n');

		for (let i = 1; i < rows.length; i++) {
			const row = rows[i].split(',');
			if (row[0] === 'GROUP') {
				table.add('item', row[2]);
				continue;
			}
			const item = table.add('item', row[0]);
			item.subItems[0].text = row[2];
			item.subItems[1].text = row[5];
			item.subItems[2].text = row[4];
		}

		function getComp(res: string) {
			switch (res) {
				case '1080p':
					return comp_1080p;
				case '1440p':
					return comp_1440p;
				case '2160p':
					return comp_2160p;
				default:
					return comp_1440p;
			}
		}

		cutsbtn.onClick = function () {
			try {
				skippedLines = [];
				const cuts = getCuts();
				if (!cuts) {
					alert('cuts.csv not found');
					return;
				}

				let activecomp = app.project.activeItem as CompItem;
				// if the viewer is the comp viewer and isn't active
				if (
					app.activeViewer.type == ViewerType.VIEWER_COMPOSITION &&
					app.activeViewer.active == false
				) {
					// make active
					app.activeViewer.setActive();
					// if the new activeItem isn't the original activeItem, then it's the project panel
					if (app.project.activeItem != activecomp) {
						alert('Select composition.');
						return;
					}
				}

				const blur_layer = activecomp.layer('killfeed_blur');
				const precomp = activecomp.layer('killfeed_precomp');

				if (!blur_layer || !precomp) {
					logger(
						'Cant find killfeed_precomp or killfeed_blur\nComposition name: ' +
							activecomp.name,
						'Cant find killfeed_precomp or killfeed_blur'
					);

					return;
				}

				const fps = (activecomp as CompItem).frameRate;
				const data = readCSV(cuts);
				const rows: string[] = data.split('\n');

				progressbar1.value = 0;
				const increment = 100 / rows.length;
				progressbar1.value = increment;
				for (let i = 1; i < rows.length; i++) {
					progressbar1.value += increment;
					win.update();
					const row = rows[i].split(',');
					const inpoint = getFrames(row[0], fps);
					const outpoint = getFrames(row[1], fps);
					if (inpoint === null || outpoint === null) {
						skippedLines.push('Cant parse timecode:\n' + row.join(', '));
						continue;
					}

					precomp.opacity.setValueAtTime((inpoint - 1) / fps, 0);
					precomp.opacity.setValueAtTime(inpoint / fps, 100);
					precomp.opacity.setValueAtTime((outpoint - 1) / fps, 100);
					precomp.opacity.setValueAtTime(outpoint / fps, 0);

					blur_layer.opacity.setValueAtTime((inpoint - 1) / fps, 0);
					blur_layer.opacity.setValueAtTime(inpoint / fps, 100);
					blur_layer.opacity.setValueAtTime((outpoint - 1) / fps, 100);
					blur_layer.opacity.setValueAtTime(outpoint / fps, 0);
				}
				if (skippedLines.length > 0) {
					logger(
						`Skipped lines:\n\n${skippedLines.join('\n\n')}`,
						'Few lines were skipped\nCheck logs.txt file, which is located next to project file.'
					);
				}
				alert(`Added opacity keyframes to ${precomp.name} and ${blur_layer.name}`);
			} catch (error) {
				if (error instanceof Error) {
					logger(
						'Cuts function error:\n' +
							`${error.description}\n` +
							`${error.toString()}\n` +
							error.toSource(),
						'Uncaught error in Cuts function\nCheck log.txt which is located next to project file'
					);
				} else {
					alert(error);
				}
			}
		};

		renderbtn.onClick = function () {
			progressbar1.value = 0;
			processDeathnotices(data, getComp(res.selection.toString()));
			alert(
				`Exported files to:\n${app.project.file.path}/killfeed_${
					getComp(res.selection.toString()).name
				}`
			);
		};

		placebtn.onClick = function () {
			try {
				skippedLines = [];
				progressbar1.value = 0;
				let activecomp = app.project.activeItem;
				// if the viewer is the comp viewer and isn't active
				if (
					app.activeViewer.type == ViewerType.VIEWER_COMPOSITION &&
					app.activeViewer.active == false
				) {
					// make active
					app.activeViewer.setActive();
					// if the new activeItem isn't the original activeItem, then it's the project panel
					if (app.project.activeItem != activecomp) {
						alert('Select composition.');
						return;
					}
				}

				let folder;
				let files = [];
				for (let i = 1; i < killfeedfolder.numItems + 1; i++) {
					let item = killfeedfolder.item(i);
					if (item instanceof FolderItem && item.name === 'killfeed_files') {
						folder = item;
						for (let j = 1; j < folder.numItems + 1; j++) {
							let file = folder.item(j);
							if (file instanceof FootageItem && file.name.indexOf('.png') !== -1) {
								files.push(file);
							}
						}
						break;
					}
				}
				if (!folder) {
					alert('killfeed_files folder not found');
					return;
				}
				if (files.length < 1) {
					alert('no files found in killfeed_files folder');
					return;
				}

				const fps = (activecomp as CompItem).frameRate;
				const rows: string[] = data.split('\n');
				const filteredRows: string[][] = [];

				for (let i = 1; i < rows.length; i++) {
					const row = rows[i].split(',');
					const nextRow = rows[i + 1] ? rows[i + 1].split(',') : null;
					if (row[0] === 'GROUP') {
						if (nextRow && (nextRow[12] !== '' || nextRow[12] !== undefined)) {
							const frames = getFrames(nextRow[12], fps);
							if (frames === null) {
								skippedLines.push('Cant parse timecode:' + row.join(', '));
								continue;
							}

							row.pop();
							row.push((frames - 1).toString());
							filteredRows.push(row);
							continue;
						}
					}
					if (row[12] === '' || row[12] === undefined || row[12] === null) {
						skippedLines.push('No timecode for marker:\n' + row.join(', '));
						continue;
					}
					const frames = getFrames(row[12], fps);
					if (frames === null) {
						skippedLines.push('Cant parse timecode:' + row.join(', '));
						continue;
					}
					row.pop();
					row.push(frames.toString());
					filteredRows.push(row);
				}

				const sortedRows = filteredRows.sort((a, b) => {
					const rA = a[12];
					const rB = b[12];
					return parseInt(rA) - parseInt(rB);
				});

				const increment = 100 / sortedRows.length;

				let layers: Layer[] = [];
				let prevlayer;
				let localfragnum = '0';
				for (let i = 0; i < sortedRows.length; i++) {
					progressbar1.value += increment;
					win.update();
					const row = sortedRows[i];
					if (row[0] === 'GROUP') {
						localfragnum = row[1];
						continue;
					}

					if (row[12] === undefined || row[12] === '') {
						skippedLines.push('No timecode for marker:\n' + row.join(', '));
						continue;
					}

					if (Number(row[0]) < 1 || Number(row[0]) > 10) {
						skippedLines.push('Row is out of range 1 to 10\n' + row.join(', '));
						continue;
					}

					const localindex = row[0];
					let isFound = false;
					for (let j = 0; j < files.length; j++) {
						const filename = (files as FootageItem[])[j].name.split('.')[0];
						const fragindex = filename.split('_').pop();
						const fragnum = filename.split('_')[0];

						if (fragnum === localfragnum && fragindex === localindex) {
							isFound = true;
							const layer = (activecomp as CompItem).layers.add(
								(files as FootageItem[])[j]
							);
							layer.startTime = parseInt(row[12]) / fps;

							layers.push(layer);

							if (prevlayer) {
								(prevlayer as Layer).outPoint = parseInt(row[12]) / fps;
							}
							prevlayer = layer;
							break;
						}
					}
					if (!isFound) skippedLines.push('No file found for line:\n' + row.join(', '));
				}

				if (skippedLines.length > 0) {
					logger(
						`Skipped lines:\n\n${skippedLines.join('\n\n')}`,
						'Few lines were skipped\nCheck logs.txt file, which is located next to project file.'
					);
				}

				if (layers.length === 0) return;

				let layers_indexes = map(layers, (layer) => layer.index);

				let precomp = (activecomp as CompItem).layers.precompose(
					layers_indexes,
					'killfeed_precomp',
					true
				);

				let precomp_mask = (activecomp as CompItem).layer(precomp.name).duplicate();
				precomp_mask.name = 'killfeed_precomp_mask';
				precomp_mask.moveAfter((activecomp as CompItem).layer(2));

				(
					precomp_mask('Effects') as _PropertyClasses & {
						addProperty(name: string): _PropertyClasses;
					}
				).addProperty('Matte Choker');
				(
					precomp_mask('Effects')
						.property('Matte Choker')
						.property('Geometric Softness 1') as Property
				).setValue(0);

				(
					precomp_mask('Effects').property('Matte Choker').property('Choke 1') as Property
				).setValue(-40);

				(
					precomp_mask('Effects')
						.property('Matte Choker')
						.property('Gray Level Softness 1') as Property
				).setValue(0);

				(
					precomp_mask('Effects')
						.property('Matte Choker')
						.property('Gray Level Softness 2') as Property
				).setValue(0);

				let adjustment = (activecomp as CompItem).layers.addSolid(
					[0, 0, 0],
					'killfeed_blur',
					(activecomp as CompItem).width,
					(activecomp as CompItem).height,
					1
				) as AVLayer & {
					setTrackMatte(layer: Layer, trackMatteType: TrackMatteType): void;
				};

				adjustment.adjustmentLayer = true;

				(
					adjustment('Effects') as _PropertyClasses & {
						addProperty(name: string): _PropertyClasses;
					}
				).addProperty('Gaussian Blur');

				(
					adjustment('Effects')
						.property('Gaussian Blur')
						.property('Blurriness') as Property
				).setValue(50);

				adjustment.moveAfter((activecomp as CompItem).layer(3));

				adjustment.setTrackMatte(precomp_mask, TrackMatteType.ALPHA);

				alert(`Frags were placed in ${activecomp.name} composition`);
			} catch (error) {
				if (error instanceof Error) {
					logger(
						'Place function error:\n' +
							`${error.description}\n` +
							`${error.toString()}\n` +
							error.toSource(),
						'Uncaught error in Place function\nCheck log.txt which is located next to project file.'
					);
				} else {
					alert(error);
				}
			}
		};

		win.center();
		win.show();
	} catch (error) {
		if (error instanceof Error) {
			logger(
				'Render function error:\n' +
					`${error.description}\n` +
					`${error.toString()}\n` +
					error.toSource(),
				'Uncaught error in Main function\nCheck log.txt which is located next to project file.'
			);
		} else {
			alert(error);
		}
	}
}

mainEntry();
