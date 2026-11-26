export const APP_NAME = 'FoodControl'

function BrandName({ className = '' }) {
  return <span className={className} translate="no">{APP_NAME}</span>
}

export default BrandName
