const fs = require('fs');
const file = 'frontend/src/components/DeviceForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// modify submit
content = content.replace(
/      await onSubmit\(\{\n        serial_number: values\.serialNumber\.trim\(\),\n        model_name: values\.modelName\.trim\(\),\n        category_id: Number\(values\.categoryId\),\n        entity_id: Number\(values\.entityId\),\n        location_id: Number\(values\.locationId\),\n        owner_id: Number\(values\.ownerId\),\n      \}\)/,
`      await onSubmit({
        serial_number: values.serialNumber.trim(),
        model_name: values.modelName.trim(),
        category_id: Number(values.categoryId),
        entity_id: Number(values.entityId),
        location_id: Number(values.locationId),
        owner_id: Number(values.ownerId),
        order_number: isZurich ? values.orderNumber.trim() : null,
      })`
);

let isZurichCheck = `
  const selectedEntity = entities.find((e) => String(e.id) === values.entityId)
  const isZurich = selectedEntity?.name.toLowerCase() === 'zurich'

  const handleSubmit = async`;
content = content.replace('  const handleSubmit = async', isZurichCheck);

let field = `        {errors.entityId ? <span className="add-device-form__error">{errors.entityId}</span> : null}
      </label>

      {isZurich ? (
        <label>
          Numéro de commande
          <input
            type="text"
            value={values.orderNumber}
            onChange={(event) => {
              updateValue('orderNumber', event.target.value)
            }}
            disabled={isDisabled}
          />
        </label>
      ) : null}`;
content = content.replace(/        \{errors\.entityId \? <span className="add-device-form__error">\{errors\.entityId\}<\/span> : null\}\n      <\/label>/, field);


fs.writeFileSync(file, content);
