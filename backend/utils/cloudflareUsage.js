/**
 * Cloudflare usage checks via GraphQL Analytics API.
 * Used to enforce free-tier safeguards (e.g. R2 storage under 10 GB).
 *
 * Requires: CLOUDFLARE_API_TOKEN with Account > Account Analytics > Read.
 * Optional: R2_ACCOUNT_ID, R2_BUCKET_NAME for bucket-specific storage check.
 */

const axios = require('axios');
const GRAPHQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

const R2_STORAGE_QUERY = `
  query R2Storage($accountTag: string!, $bucketName: string!, $startDate: Time!, $endDate: Time!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        r2StorageAdaptiveGroups(
          limit: 1
          filter: {
            datetime_geq: $startDate
            datetime_leq: $endDate
            bucketName: $bucketName
          }
          orderBy: [datetime_DESC]
        ) {
          max {
            payloadSize
            objectCount
          }
          dimensions {
            datetime
          }
        }
      }
    }
  }
`;

/**
 * Fetch current R2 storage (payload size in bytes) for the configured bucket.
 * Uses Cloudflare GraphQL Analytics API; metrics may lag by a few minutes.
 *
 * @returns {Promise<{ payloadSize: number, objectCount: number } | null>}
 *   Latest payloadSize and objectCount, or null if token missing / API error.
 */
async function getR2StorageBytes() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!apiToken || !accountId || !bucketName) {
    return null;
  }

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
  const variables = {
    accountTag: accountId,
    bucketName,
    startDate: startDate.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    endDate: endDate.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };

  try {
    const res = await axios.post(
      GRAPHQL_ENDPOINT,
      { query: R2_STORAGE_QUERY, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        timeout: 10000,
      }
    );

    const json = res.data;
    const accounts = json?.data?.viewer?.accounts;
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return null;
    }

    const groups = accounts[0].r2StorageAdaptiveGroups;
    if (!groups || groups.length === 0) {
      return { payloadSize: 0, objectCount: 0 };
    }

    const row = groups[0];
    const payloadSize = Number(row?.max?.payloadSize) || 0;
    const objectCount = Number(row?.max?.objectCount) || 0;
    return { payloadSize, objectCount };
  } catch (err) {
    console.warn('[cloudflareUsage] Failed to fetch R2 storage:', err.message);
    return null;
  }
}

/**
 * Check if adding addBytes would exceed the soft limit (default 9.5 GB).
 * @param {number} addBytes - Size of the file to upload
 * @returns {Promise<{ allowed: boolean, currentBytes?: number, limitBytes: number }>}
 */
async function checkR2StorageLimit(addBytes) {
  const limitBytes = parseInt(process.env.R2_SOFT_LIMIT_BYTES, 10) || 9.5 * 1e9; // 9.5 GB
  const usage = await getR2StorageBytes();
  if (usage === null) {
    return { allowed: true, limitBytes }; // no token → don't block
  }
  const currentBytes = usage.payloadSize;
  const allowed = currentBytes + addBytes <= limitBytes;
  return { allowed, currentBytes, limitBytes };
}

module.exports = {
  getR2StorageBytes,
  checkR2StorageLimit,
};
