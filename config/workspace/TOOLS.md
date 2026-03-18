# TOOLS.md - Local Notes

---

## Structured Database (db-mcp)

When the user says "database", "store this", "save that", or "track" — they mean db-mcp.

**Calling pattern:** `exec("mcporter call db-mcp.<tool> userId=<id> ...")`

**Tools:** `list_schemas`, `define_schema`, `get_schema`, `update_schema`, `delete_schema`, `create_record`, `get_record`, `update_record`, `delete_record`, `query_records`, `count_records`

**Params:** simple `key=value`, quoted `key="has spaces"`, JSON `key='{"a":1}'`, bool `key=true`

### userId

Required on every call. Check `USER.md` for saved value. If missing, ask the user once and save it.

### db-mcp vs Memory Files

db-mcp = user's data (structured, queryable, visible in UI). Memory files = your internal context (notes, preferences, session logs).

### Type → inputType

`string`→text/textarea/select, `number`→number, `boolean`→toggle, `date`→date, `array`→list, `object`→group. Mismatches rejected.

### Schema Metadata

Schemas must be self-documenting — readable by any agent with zero prior context.

**On the schema:** `displayName`, `description`, `purpose` (why it exists), `instructions` (when/how to create/query records), `tags`, `createdBy`, `examples` (sample records as JSON array)

**On each field:** `label`, `hint` (how to populate), `default`, `required`, `order`, `description`

Example:
```
mcporter call db-mcp.define_schema userId=user123 schemaName=contacts \
  displayName="Contacts" description="Contact directory" \
  purpose="Look up people when user asks about someone" \
  instructions="Create when user mentions a new person. Always get name+email first." \
  tags='["crm","contacts"]' createdBy=openclaw \
  fields='{"name":{"type":"string","label":"Name","required":true,"hint":"Full name"},"email":{"type":"string","label":"Email","hint":"Primary email"},"category":{"type":"string","inputType":"select","options":["work","personal"],"default":"work"}}'
```

### First-time Discovery

Start of session → `list_schemas`. Response includes `purpose` and `instructions` per schema — enough to operate without prior context.

### Proactive Behavior

- Suggest db-mcp when user mentions structured info they'd want to track
- Show field plan before creating a schema
- Confirm what was stored after creating records
- Check existing schemas before creating — avoid duplicates

---

## Other Tools

Add environment-specific notes below as needed.
