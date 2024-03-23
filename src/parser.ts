import { parseEvent, parsePlayerInfo } from '@laihoe/demoparser2';
import { player_death, playerinfo } from './types';
import { formatKills, getFrag, isNotNull } from './utils';
import path from 'path';
import { rootdir } from './main';

export const getKills = (file: string) => {
	try {
		const kills: player_death[] = parseEvent(
			file,
			'player_death',
			['is_warmup_period', 'team_name', 'team_clan_name', 'team_rounds_total'],
			['total_rounds_played', 'round_win_status']
		);
		let killsNoWarmup = kills.filter((kill) => kill.is_warmup_period == false);
		let filteredKills = killsNoWarmup.filter(
			(kill) => kill.attacker_team_name != kill.user_team_name
		);

		return filteredKills;
	} catch (error) {
		if (error instanceof Error) {
			console.log('Parsing error:');
			console.log(error.message);
		} else {
			console.error(error);
		}
	}
};

export const getPlayers = (file: string) => {
	const players: playerinfo[] = parsePlayerInfo(file);

	const longestNameLength = players.reduce((max, player) => Math.max(max, player.name.length), 0);

	const tabSize = 8;

	const formattedPlayers = players
		.sort((a, b) => a.team_number - b.team_number)
		.map((player, index) => {
			const tabsNeeded =
				Math.ceil((longestNameLength + 1) / tabSize) -
				Math.floor(player.name.length / tabSize);

			if (!player.steamid) return '';
			if ((index + 1) % 5 === 0) {
				return player.name + '\t'.repeat(tabsNeeded) + player.steamid + '\n';
			}

			return player.name + '\t'.repeat(tabsNeeded) + player.steamid;
		})
		.join('\n');

	return formattedPlayers;
};

export const parseDemo = (input: string, kills: player_death[], startIndex: number = 1) => {
	const values = input.split(',');

	const out: string[][][] = [];

	values.forEach((value, index) => {
		const frag = getFrag(value, kills, startIndex + index);
		if (frag === null) {
			startIndex--;
			return;
		}
		out.push(frag);
	});

	return out.map((frag) => frag.map((line) => line.join('\t')).join('\n'));
};

export const parseGroupAsIs = (
	group: string[],
	kills: Map<string, player_death[]>,
	index: number
) => {
	const groupKills = group
		.map((line) => {
			const demoname = line.split(',')[0];
			const steamId = line.split(',')[1];
			const tick = line.split(',')[2];
			const lineKills = kills.get(demoname) as player_death[];
			if (!lineKills) return null;
			const filteredKills = lineKills
				.filter((kill) => kill.attacker_steamid === steamId)
				.filter((kill) => kill.tick >= parseInt(tick) - 5)
				.slice(0, 1);

			if (filteredKills.length === 0) return null;
			return filteredKills[0];
		})
		.filter(isNotNull);

	const formattedKills = formatKills(groupKills);

	return (
		['GROUP', `${index.toString()}`, `${formattedKills.length}k`].join('\t') +
		'\n' +
		formattedKills.map((kill) => kill.join('\t')).join('\n')
	);
};

export const getKillfeed = (input: string, startIndex: number = 1, asIs?: boolean) => {
	try {
		const rows = input.split('\n');

		const demoNames = new Set<string>();

		const demos: string[] = [];

		let frags: string[] = [];
		let groups: string[][] = [];

		rows.forEach((row) => {
			const line = row.split('\t');

			if (
				line[0] === 'demoname' ||
				!(line[0] || line[1] || line[2]) ||
				line[0] === '' ||
				line[1] === '' ||
				line[2] === ''
			) {
				groups.push(frags);
				frags = [];
				return;
			}
			frags.push([line[0], line[1], line[2]].join(','));
			demoNames.add(line[0]);
		});

		groups.push(frags);

		const demoKills = new Map<string, player_death[]>();

		demoNames.forEach((demoname) => {
			const kills = getKills(path.resolve(rootdir, 'demos', `${demoname}.dem`));
			if (!kills) {
				console.log(`Kills were not parsed in demo ${demoname}`);
				return;
			}
			demoKills.set(demoname, kills);
		});

		if (asIs) {
			const out = groups.map((group, index) => {
				if (group.length === 0) return '';

				const kills = new Map<string, player_death[]>();

				group.forEach((row) => {
					const demoname = row.split(',')[0];
					if (!kills.has(demoname))
						kills.set(demoname, demoKills.get(demoname) as player_death[]);
				});

				const res = parseGroupAsIs(group, kills, index + startIndex);
				return res;
			});

			return out.join('\n');
		}

		groups.forEach((group) => {
			if (group.length === 0) return;

			const localdata: string[] = [];
			const fragsByPlayers = group.reduce((acc: { [key: string]: string[] }, row: string) => {
				const steam = row.split(',')[1];
				if (!acc[steam]) acc[steam] = [];
				acc[steam].push(row.split(',')[2]);
				return acc;
			}, {});

			const demoname = group[0].split(',')[0];

			Object.keys(fragsByPlayers).forEach((steamid) => {
				const frags = fragsByPlayers[steamid];
				const tick = (parseInt(frags[0]) - 5).toString();
				const fragNum = frags.length;
				localdata.push(`${tick}-${steamid}-${fragNum}`);
			});

			demos.push(`${demoname}\t${localdata.join(',')}`);
		});

		const out = demos.map((demo, index) => {
			if (demo === '') return '';
			const demoname = demo.split('\t')[0];
			if (!demoKills.has(demoname)) return '';
			const input = demo.split('\t')[1];
			if (!input) return '';
			const kills = demoKills.get(demoname) as player_death[];
			if (!kills) return '';
			const res = parseDemo(input, kills, index + startIndex);
			if (res.length === 0) {
				startIndex--;
				return '';
			}
			if (res.length > 1) startIndex = startIndex + res.length - 1;
			return res.join('\n');
		});
		return out.filter((demo) => demo !== '').join('\n');
	} catch (error) {
		if (error instanceof Error) {
			console.log('Killfeed error:');
			console.log(error.name);
			console.log(error.message);
			console.log(error.stack);
		} else {
			console.error(error);
		}
	}
};
