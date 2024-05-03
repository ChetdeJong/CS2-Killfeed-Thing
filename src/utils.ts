import { parseHeader } from '@laihoe/demoparser2';
import fs from 'fs';
import path from 'path';
import { getKills } from './parser';
import { header, player_death } from './types';

function getFrames(timecode: string, fps: number = 30) {
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

export const formatInAndOutPoints = (input: string[]) => {
	const lines = input.filter(
		(line) => line.split('\t')[0] !== '' && line.split('\t')[0].includes(':')
	);

	lines.sort((a, b) => {
		const framesA = getFrames(a.split('\t')[0]);
		const framesB = getFrames(b.split('\t')[0]);

		if (framesA !== null && framesB !== null) {
			return framesA - framesB;
		} else {
			return 0;
		}
	});

	let currentfrag = '';
	let isFirstKillPassed = false;
	const inPoints: string[] = ['in points'];
	const outPoints: string[] = ['out points'];

	lines.forEach((line, idx) => {
		const nextline = lines[idx + 1];

		if (!nextline) return;

		// save current pov
		if (line.includes('pov')) currentfrag = line.split('\t')[1];

		// in point if current is marker and first kill is not passed
		if (!line.includes('campath') && !line.includes('pov') && !isFirstKillPassed) {
			inPoints.push(line.split('\t')[0]);
			isFirstKillPassed = true;
		}

		// skip until first marker is passed
		if (!isFirstKillPassed) return;

		// out point if current is pov next is campath
		if (line.includes('pov') && nextline.includes('campath'))
			return outPoints.push(nextline.split('\t')[0]);

		// out point if current is pov and next is different pov and not marker
		if (
			line.includes('pov') &&
			nextline.split('\t')[1] !== currentfrag &&
			!(!nextline.includes('campath') && !nextline.includes('pov'))
		)
			return outPoints.push(nextline.split('\t')[0]);

		// in point if current is campath and next is pov and next is not different pov
		if (
			line.includes('campath') &&
			nextline.includes('pov') &&
			nextline.split('\t')[1] === currentfrag
		)
			return inPoints.push(nextline.split('\t')[0]);

		// in point if next is marker
		if (
			(line.includes('pov') || line.includes('campath')) &&
			!nextline.includes('campath') &&
			!nextline.includes('pov')
		)
			return inPoints.push(nextline.split('\t')[0]);

		// out point if current is marker next is campath
		if (!line.includes('campath') && !line.includes('pov') && nextline.includes('campath'))
			return outPoints.push(nextline.split('\t')[0]);

		// out point if current is marker and next is pov and next is different pov
		if (
			!line.includes('campath') &&
			!line.includes('pov') &&
			nextline.includes('pov') &&
			nextline.split('\t')[1] !== currentfrag
		)
			return outPoints.push(nextline.split('\t')[0]);
	});

	const points = inPoints.join('\n') + '\n\n' + outPoints.join('\n');

	const res = lines.length === 0 ? undefined : points;

	return res;
};

export const formatKills = (kills: player_death[]) => {
	const out: string[][] = [];
	kills.forEach((kill, index) => {
		out.push([
			(index + 1).toString(),
			kill.attacker_team_name === 'TERRORIST' ? 'T' : 'CT',
			kill.attacker_name,
			kill.user_team_name === 'TERRORIST' ? 'T' : 'CT',
			kill.user_name,
			kill.weapon.trim().replace(/\s/g, '').toLowerCase(),
			kill.headshot ? 'TRUE' : 'FALSE',
			kill.penetrated === 0 ? 'FALSE' : 'TRUE',
			kill.noscope ? 'TRUE' : 'FALSE',
			kill.thrusmoke ? 'TRUE' : 'FALSE',
			kill.attackerblind ? 'TRUE' : 'FALSE',
			kill.attackerinair ? 'TRUE' : 'FALSE'
		]);
	});
	return out;
};

export const mostCommonWeapon = (values: string[]) => {
	let frequencyMap: { [key: string]: number } = values.reduce(
		(acc: { [key: string]: number }, val: string) => {
			acc[val] = (acc[val] || 0) + 1;
			return acc;
		},
		{}
	);

	let mostCommonItem = Object.keys(frequencyMap).reduce((a, b) =>
		frequencyMap[a] > frequencyMap[b] ? a : b
	);

	return mostCommonItem.toLowerCase();
};

export const getOneFrag = (tick: number, steamId: string, kills: player_death[], index: number) => {
	const filteredKills = kills
		.filter((kill) => kill.attacker_steamid === steamId)
		.filter((kill) => kill.tick >= tick)
		.slice(0, 1);

	if (filteredKills.length === 0) return null;
	const formattedKills = formatKills(filteredKills);

	const weapon = filteredKills.map((kill) =>
		kill.weapon.trim().replace(/\s/g, '').toLowerCase()
	)[0];

	formattedKills.unshift([
		'GROUP',
		`${index.toString()}`,
		`${filteredKills[0].attacker_name}-${
			filteredKills.length
		}k-${weapon}-vs-${filteredKills[0].user_team_clan_name.trim().replace(/\s/g, '')}`
	]);

	return formattedKills;
};

export const getFrag = (values: string, kills: player_death[], index: number) => {
	const inputArray = values.split('-');
	const providedtick = parseInt(inputArray[0]);
	const steamId = inputArray[1];
	const fragnum = parseInt(inputArray[2]);

	const filteredKills = kills
		.filter((kill) => kill.attacker_steamid === steamId)
		.filter((kill) => kill.tick >= providedtick)
		.slice(0, fragnum);

	if (filteredKills.length === 0) return null;
	const formattedKills = formatKills(filteredKills);

	const weapons = filteredKills.map((kill) =>
		kill.weapon.trim().replace(/\s/g, '').toLowerCase()
	);
	const weapon = mostCommonWeapon(weapons);

	const teamName = filteredKills[0].user_team_clan_name ? filteredKills[0].user_team_clan_name.trim().replace(/\s/g, '') : 'NOTEAM'

	formattedKills.unshift([
		'GROUP',
		`${index.toString()}`,
		`${filteredKills[0].attacker_name}-${
			filteredKills.length
		}k-${weapon}-vs-${teamName}`
	]);

	return formattedKills;
};

export const saveToTSV = (data: string) => {
	const date = new Date();
	const current_date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
		2,
		'0'
	)}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(
		2,
		'0'
	)}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
	fs.writeFile(`${current_date}.tsv`, data, (err) => {
		if (err) {
			console.clear();
			console.error('An error occurred:', err);
		} else {
			console.log(`Saved to ${current_date}.tsv`);
		}
	});
};

export const getKillsByRound = (
	filteredKills: player_death[]
): { [key: number]: { [key: string]: player_death[] } } => {
	const killsByRound = filteredKills.reduce(
		(acc: { [key: number]: { [key: string]: player_death[] } }, kill: player_death) => {
			const round = kill.total_rounds_played;
			if (!acc[round]) {
				acc[round] = {};
			}
			if (!acc[round][kill.attacker_steamid]) {
				acc[round][kill.attacker_steamid] = [];
			}
			acc[round][kill.attacker_steamid].push(kill);
			return acc;
		},
		{}
	);

	return killsByRound;
};

export const getFormattedKills = (
	demo: string,
	params: {
		steamid?: string;
		includedKills: number[];
	}
) => {
	const kills = getKills(demo);

	if (!kills) {
		console.log(`Kills were not parsed in demo ${demo}`);
		return '';
	}

	const killsByRounds = getKillsByRound(kills);
	const header: header = parseHeader(demo);

	const frags = [];

	function getAllKills(
		kills: { [key: string]: player_death[] },
		params: {
			steamid?: string;
			includedKills: number[];
		}
	) {
		return Object.keys(kills).reduce((acc, steamid) => {
			if (kills[steamid].length === 0) return acc;
			if (!params.includedKills.includes(kills[steamid].length)) return acc;
			acc.push(...kills[steamid]);
			return acc;
		}, [] as player_death[]);
	}

	for (const round in killsByRounds) {
		let playerKills;

		if (params.steamid) {
			playerKills = killsByRounds[round][params.steamid];
			if (!playerKills || playerKills.length === 0) continue;
			if (!params.includedKills.includes(playerKills.length)) continue;
		} else {
			playerKills = getAllKills(killsByRounds[round], params);
		}
		if (!playerKills || playerKills.length === 0) continue;

		playerKills.sort((a, b) => a.tick - b.tick);

		const kills = playerKills.map((kill) => [
			path.basename(demo).split('.')[0],
			kill.attacker_steamid,
			kill.tick.toString(),
			kill.attacker_team_clan_name,
			kill.attacker_name,
			kill.weapon,
			kill.user_team_clan_name,
			kill.user_name,
			(kill.total_rounds_played + 1).toString(),
			header.map_name
		]);
		frags.push(...kills, ['']);
	}

	if (frags.length === 0) return '';

	return frags.map((frag) => frag.join('\t')).join('\n');
};

export function isNotNull<T>(value: T | null): value is T {
	return value !== null;
}
