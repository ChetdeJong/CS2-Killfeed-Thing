import { parseHeader } from '@laihoe/demoparser2';
import { getKills } from './parser';
import { player_death, header } from './types';
import fs from 'fs';
import path from 'path';

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
			kill.thrusmoke ? 'TRUE' : 'FALSE'
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

	formattedKills.unshift([
		'GROUP',
		`${index.toString()}`,
		`${filteredKills[0].attacker_name}-${
			filteredKills.length
		}k-${weapon}-vs-${filteredKills[0].user_team_clan_name.trim().replace(/\s/g, '')}`
	]);

	return formattedKills;
};

export const saveToCSV = (data: string) => {
	const date = new Date();
	const current_date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
		2,
		'0'
	)}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(
		2,
		'0'
	)}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
	fs.writeFile(`${current_date}.csv`, data, (err) => {
		if (err) {
			console.error('An error occurred:', err);
		} else {
			console.log(`Saved to ${current_date}.csv`);
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
