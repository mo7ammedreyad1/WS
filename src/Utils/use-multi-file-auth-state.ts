/*CF import AsyncLock from 'async-lock' */
/*CF import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises' */
import { join } from 'path'
/*CF import { proto } from '../../WAProto' */
import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '../Types'
import { initAuthCreds } from './auth-utils'
import { BufferJSON } from './generics'
import { KVNamespace } from '@cloudflare/workers-types' //CF
import { credsJsonStatus, logForDevelopment } from '..'

// We need to lock files due to the fact that we are using async functions to read and write files
// https://github.com/WhiskeySockets/Baileys/issues/794
// https://github.com/nodejs/node/issues/26338
// Default pending is 1000, set it to infinity
// https://github.com/rogierschouten/async-lock/issues/63
/*CF const fileLock = new AsyncLock({ maxPending: Infinity }) */

/**
 * stores the full authentication state in a single folder.
 * Far more efficient than singlefileauthstate
 *
 * Again, I wouldn't endorse this for any production level use other than perhaps a bot.
 * Would recommend writing an auth state for use with a proper SQL or No-SQL DB
 * */
export const useMultiFileAuthState = async(folder: string, kv: KVNamespace): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => { //CF
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	/*CF const writeData = (data: any, file: string) => {
		const filePath = join(folder, fixFileName(file)!)
		return fileLock.acquire(
			filePath,
			() => writeFile(join(filePath), JSON.stringify(data, BufferJSON.replacer))
		)
	} */

	/*CF const readData = async(file: string) => {
		try {
			const filePath = join(folder, fixFileName(file)!)
			const data = await fileLock.acquire(
				filePath,
				() => readFile(filePath, { encoding: 'utf-8' })
			)
			return JSON.parse(data, BufferJSON.reviver)
		} catch(error) {
			return null
		}
	} */

	/*CF const removeData = async(file: string) => {
		try {
			const filePath = join(folder, fixFileName(file)!)
			await fileLock.acquire(
				filePath,
				() => unlink(filePath)
			)
		} catch{

		}
	} */

	/*CF const folderInfo = await stat(folder).catch(() => { })
	if(folderInfo) {
		if(!folderInfo.isDirectory()) {
			throw new Error(`found something that is not a directory at ${folder}, either delete it or specify a different location`)
		}
	} else {
		await mkdir(folder, { recursive: true })
	} */

	const writeData = async (data: any, file: string) => {
		const filePath = join(join(folder, fixFileName(file)!))
		const dataFormatted = JSON.stringify(data, BufferJSON.replacer)
		if (logForDevelopment.show) console.log('WARNING [writeData()] content of creds.js', '[data]', data) //CF
		if (logForDevelopment.show) console.log('WARNING [writeData()] content of creds.js]', '[folder]', folder) //CF

		let customMetadata: Record<string, string> = {}

		if (logForDevelopment.show) console.log('WARNING [writeData()] await kv.getWithMetadata', '[filePath]', filePath) //CF
		const verifyExist = await kv.getWithMetadata(filePath)
		if (!verifyExist || verifyExist.value === null) {
			customMetadata.userBot = filePath?.split("/")?.slice(-2, -1)?.[0] || 'not found'
			customMetadata.phone = data?.me?.id?.split(":")?.[0] || data?.id || 'not found'
			customMetadata.path = filePath || 'not found'
			customMetadata.created = new Date().toISOString()
		}

		else {
			customMetadata = (verifyExist?.metadata as Record<string, string>) || {}
			customMetadata.name = data?.me?.name || (verifyExist?.metadata as Record<string, string>)?.name || 'not found'
		}
		if (logForDevelopment.show) console.log('WARNING [writeData()] await kv.getWithMetadata', '[verifyExist]', verifyExist) //CF

		if (logForDevelopment.show) console.log('WARNING [writeData()] await kv.put', '[filePath]', filePath) //CF
		if (logForDevelopment.show) console.log('WARNING [writeData()] await kv.put', '[customMetadata]', customMetadata) //CF
		const resultKvPut = await kv.put(filePath, dataFormatted, {
			metadata: customMetadata
		})
		credsJsonStatus.update = true

		if (logForDevelopment.show) console.log('WARNING [writeData()] await kv.put', '[resultKvPut]', resultKvPut) //CF
	}

	const readData = async(file: string) => {
		try {
			const filePath = join(folder, fixFileName(file)!)

			if (logForDevelopment.show) console.log('WARNING [readData()] await kv.get', '[filePath]', filePath) //CF

			const data = await kv.get(filePath)
			if (logForDevelopment.show) console.log('WARNING [readData()] await kv.get', '[data]', data) //CF
			if (data === null) { return null }

			const resultKvParse = JSON.parse(data, BufferJSON.reviver)
			if (logForDevelopment.show) console.log('WARNING [readData()] JSON.parse', '[resultKvParse]', resultKvParse) //CF

			return resultKvParse
		} catch(error) {
			return null
		}
	}

	const removeData = async(file: string) => {
		try {
			const filePath = join(folder, fixFileName(file)!)
			if (logForDevelopment.show) console.log('WARNING [removeData()] await kv.delete', '[filePath]', filePath) //CF
			await kv.delete(filePath)
			if (logForDevelopment.show) console.log('WARNING [removeData()] await kv.delete', '[void]', void 0) //CF
		} catch{

		}
	}

	const fixFileName = (file?: string) => file?.replace(/\//g, '__')?.replace(/:/g, '-')

	const creds: AuthenticationCreds = await readData('creds.json') || initAuthCreds()

	return {
		state: {
			creds,
			keys: {
				get: async(type, ids) => {
					/*CF const data: { [_: string]: SignalDataTypeMap[typeof type] } = { }
					await Promise.all(
						ids.map(
							async id => {
								let value = await readData(`${type}-${id}.json`)
								if(type === 'app-state-sync-key' && value) {
									value = proto.Message.AppStateSyncKeyData.fromObject(value)
								}

								data[id] = value
							}
						)
					)

					return data */

					//CF \/
					const data: { [_: string]: SignalDataTypeMap[typeof type] } = { }
					ids.map(
						id => {
							let value = null as any
							data[id] = value
						}
					)
					//CF /\

					return data
				},
				set: async(data) => {
					/*CF const tasks: Promise<void>[] = []
					for(const category in data) {
						for(const id in data[category]) {
							const value = data[category][id]
							const file = `${category}-${id}.json`
							tasks.push(value ? writeData(value, file) : removeData(file))
						}
					}

					await Promise.all(tasks) */

					return void 0 //CF
				}
			}
		},
		saveCreds: async () => { //CF
			return await writeData(creds, 'creds.json') //CF
		}
	}
}
