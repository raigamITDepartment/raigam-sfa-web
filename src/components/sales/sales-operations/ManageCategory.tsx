import CommonTabs from '@/components/common-tabs'
import CategoryType from '@/components/sales/sales-operations/manage-category/CategoryType'
import Flavour from '@/components/sales/sales-operations/manage-category/Flavour'
import MainCategory from '@/components/sales/sales-operations/manage-category/MainCategory'
import SubCategory from '@/components/sales/sales-operations/manage-category/SubCategory'
import SubSubCategory from '@/components/sales/sales-operations/manage-category/SubSubCategory'

const MANAGE_CATEGORY_STORAGE_KEY = 'manage-category-active-tab'
const DEFAULT_MANAGE_CATEGORY_TAB = 'category-type'

const ManageCategory = () => {
  return (
    <CommonTabs
      defaultValue={DEFAULT_MANAGE_CATEGORY_TAB}
      storageKey={MANAGE_CATEGORY_STORAGE_KEY}
      items={[
        {
          value: 'category-type',
          label: 'Category Type',
          content: <CategoryType />,
        },
        {
          value: 'main-category',
          label: 'Main Category',
          content: <MainCategory />,
        },
        {
          value: 'sub-category',
          label: 'Sub-Category',
          content: <SubCategory />,
        },
        {
          value: 'sub-sub-category',
          label: 'Sub-sub Category',
          content: <SubSubCategory />,
        },
        {
          value: 'flavour',
          label: 'Flavour',
          content: <Flavour />,
        },
      ]}
    />
  )
}

export default ManageCategory
