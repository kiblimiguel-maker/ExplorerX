const PRIVATE_ADDRESS = /(?:strasse|straße|str\.?|weg|gasse|allee|platz|street|road|avenue)\s*\d+[a-z]?\b/i

export const isPrivateAddress = (value: string) => PRIVATE_ADDRESS.test(value.trim())
