import type {
  TopologyEntity,
  EntityContext,
  FileContext,
  ColumnContext,
  ChatMessageContext,
  DataStoreContext,
  DeviceContext,
  IdentityContext,
  ApplicationContext,
  WebsiteContext,
} from '@/types/topology'

// Returns a short one-line context summary for display in the entity card subtitle
export function formatEntityContext(entity: TopologyEntity): string {
  const c = entity.context
  switch (entity.type) {
    case 'file': {
      const f = c as FileContext
      return [f.mimeType, f.size].filter(Boolean).join(' · ')
    }
    case 'column': {
      const col = c as ColumnContext
      return [col.service, col.dataStore].filter(Boolean).join(' · ')
    }
    case 'chat-message': {
      const m = c as ChatMessageContext
      return [m.application, m.sender].filter(Boolean).join(' · ')
    }
    case 'data-store': {
      const d = c as DataStoreContext
      return [d.service, d.account].filter(Boolean).join(' · ')
    }
    case 'device': {
      const dev = c as DeviceContext
      const mgmt = { managed: 'Managed', unmanaged: 'Unmanaged', byod: 'BYOD' }[dev.managementStatus]
      const parts = [mgmt, dev.platform, dev.owner].filter(Boolean)
      return parts.join(' · ')
    }
    case 'identity': {
      const id = c as IdentityContext
      const status = {
        active: 'Active',
        suspended: 'Suspended',
        stale: 'Stale',
        unlinked: 'Unlinked',
      }[id.status]
      return [status, id.group].filter(Boolean).join(' · ')
    }
    case 'application': {
      const app = c as ApplicationContext
      const sanctionedLabel = app.sanctioned ? 'Sanctioned' : 'Unsanctioned'
      return [app.category, sanctionedLabel].filter(Boolean).join(' · ')
    }
    case 'website': {
      const w = c as WebsiteContext
      return [w.urlCategory, w.destination].filter(Boolean).join(' · ')
    }

  }
}

// Returns labeled key-value pairs for the detail panel context section
export function getContextFields(entity: TopologyEntity): { label: string; value: string }[] {
  const c = entity.context
  switch (entity.type) {
    case 'file': {
      const f = c as FileContext
      return [
        f.mimeType     ? { label: 'Type',          value: f.mimeType }     : null,
        f.size         ? { label: 'Size',           value: f.size }         : null,
        f.exposure     ? { label: 'Exposure',       value: f.exposure }     : null,
        f.owner        ? { label: 'Owner',          value: f.owner }        : null,
        f.dateCreated  ? { label: 'Date Created',   value: f.dateCreated }  : null,
        f.lastModified ? { label: 'Last Modified',  value: f.lastModified } : null,
        f.objectId     ? { label: 'Object ID',      value: f.objectId }     : null,
      ].filter((x): x is { label: string; value: string } => x !== null)
    }
    case 'column': {
      const col = c as ColumnContext
      return [
        col.entityDataType   ? { label: 'Entity Data Type',  value: col.entityDataType }   : null,
        col.status           ? { label: 'Status',            value: col.status }            : null,
        col.service          ? { label: 'Platform',          value: col.service }           : null,
        col.dataStore        ? { label: 'Data Store',        value: col.dataStore }         : null,
        col.database         ? { label: 'Database',          value: col.database }          : null,
        col.schema           ? { label: 'Schema',            value: col.schema }            : null,
        col.table            ? { label: 'Table',             value: col.table }             : null,
        col.account          ? { label: 'Account',           value: col.account }           : null,
        col.sensitiveRecords ? { label: 'Sensitive Records', value: col.sensitiveRecords }  : null,
        col.firstSeenOn      ? { label: 'First Seen On',     value: col.firstSeenOn }       : null,
        col.lastModified     ? { label: 'Last Modified',     value: col.lastModified }      : null,
      ].filter((x): x is { label: string; value: string } => x !== null)
    }
    case 'chat-message': {
      const m = c as ChatMessageContext
      return [
        { label: 'Application',    value: m.application },
        m.sender        ? { label: 'Sender Email',  value: m.sender }       : null,
        m.appSuite      ? { label: 'App Suite',     value: m.appSuite }     : null,
        m.appCategory   ? { label: 'App Category',  value: m.appCategory }  : null,
        m.instanceName  ? { label: 'Instance Name', value: m.instanceName } : null,
        m.exposure      ? { label: 'Exposure',      value: m.exposure }     : null,
        m.channel       ? { label: 'Channel',       value: m.channel }      : null,
        m.dateSent      ? { label: 'Date Sent',     value: m.dateSent }     : null,
        m.attachments   ? { label: 'Attachments',   value: m.attachments }  : null,
        m.lastModified  ? { label: 'Last Modified', value: m.lastModified } : null,
        m.messageId     ? { label: 'Message ID',    value: m.messageId }    : null,
        m.senderId      ? { label: 'Sender ID',     value: m.senderId }     : null,
        m.channelId     ? { label: 'Channel ID',    value: m.channelId }    : null,
      ].filter((x): x is { label: string; value: string } => x !== null)
    }
    case 'data-store': {
      const d = c as DataStoreContext
      return [
        { label: 'Service',               value: d.service },
        d.account             ? { label: 'App Instance',        value: d.account }            : null,
        d.organization        ? { label: 'Organization',        value: d.organization }        : null,
        d.owner               ? { label: 'Owner',               value: d.owner }               : null,
        d.driveType           ? { label: 'Drive Type',          value: d.driveType }           : null,
        d.region              ? { label: 'Region',              value: d.region }              : null,
        d.dateCreated         ? { label: 'Created',             value: d.dateCreated }         : null,
        d.lastDiscoveryScan   ? { label: 'Last Discovery Scan', value: d.lastDiscoveryScan }   : null,
      ].filter((x): x is { label: string; value: string } => x !== null)
    }
    case 'device': {
      const dev = c as DeviceContext
      const mgmt = { managed: 'Managed', unmanaged: 'Unmanaged', byod: 'BYOD' }[dev.managementStatus]
      return [
        { label: 'Management',       value: mgmt },
        dev.platform        ? { label: 'Device',           value: dev.platform }        : null,
        dev.owner           ? { label: 'User',             value: dev.owner }           : null,
        dev.serialNumber    ? { label: 'Serial Number',    value: dev.serialNumber }    : null,
        dev.macAddress      ? { label: 'MAC Address',      value: dev.macAddress }      : null,
        dev.clientVersion   ? { label: 'Client Version',   value: dev.clientVersion }   : null,
        dev.uniqueDeviceId  ? { label: 'Unique Device ID', value: dev.uniqueDeviceId }  : null,
      ].filter((x): x is { label: string; value: string } => x !== null)
    }
    case 'identity': {
      const id = c as IdentityContext
      const typeLabel = {
        'user': 'User',
        'service-account': 'Service Account',
        'external': 'External User',
        'ghost': 'Ghost / Unlinked',
      }[id.identityType]
      const statusLabel = {
        active: 'Active',
        suspended: 'Suspended',
        stale: 'Stale',
        unlinked: 'Unlinked',
      }[id.status]
      return [
        { label: 'IDP',          value: id.idp },
        { label: 'IDP Status',   value: statusLabel },
        { label: 'Type',         value: typeLabel },
        id.group       ? { label: 'Group',        value: id.group }       : null,
        id.orgUnit     ? { label: 'Org Unit',      value: id.orgUnit }     : null,
        id.dateCreated ? { label: 'Date Created',  value: id.dateCreated } : null,
      ].filter((x): x is { label: string; value: string } => x !== null)
    }
    case 'application': {
      const app = c as ApplicationContext
      return [
        { label: 'Category',         value: app.category },
        app.destinationType          ? { label: 'Destination Type', value: app.destinationType }  : null,
        app.firstAccess              ? { label: 'First Access',      value: app.firstAccess }      : null,
        { label: 'Sanction Status',  value: app.sanctioned ? 'Sanctioned' : 'Unsanctioned' },
        app.instanceType             ? { label: 'Instance',          value: app.instanceType === 'personal' ? 'Personal' : app.instanceType === 'corporate' ? 'Corporate' : 'Unknown' } : null,
        app.cciScore !== undefined   ? { label: 'CCI Score',         value: `${app.cciScore} / 100` } : null,
      ].filter((x): x is { label: string; value: string } => x !== null)
    }
    case 'website': {
      const w = c as WebsiteContext
      return [
        { label: 'Category',         value: w.urlCategory },
        w.destinationType ? { label: 'Destination Type', value: w.destinationType } : null,
        w.firstAccess     ? { label: 'First Access',     value: w.firstAccess }     : null,
        w.destination     ? { label: 'Destination',      value: w.destination }     : null,
      ].filter((x): x is { label: string; value: string } => x !== null)
    }
  }
}

// Narrow context by entity type — useful for type-safe access at call sites
export function asFileContext(c: EntityContext) { return c as FileContext }
export function asDataStoreContext(c: EntityContext) { return c as DataStoreContext }
export function asIdentityContext(c: EntityContext) { return c as IdentityContext }
export function asApplicationContext(c: EntityContext) { return c as ApplicationContext }
export function asWebsiteContext(c: EntityContext) { return c as WebsiteContext }
