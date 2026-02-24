import { http } from '@/services/http'
import type { ApiResponse, Id } from '@/types/common'

export const ITEM_PRICE_BASE = '/api/v1/sales/itemPrice'
export const ITEM_MAIN_CATEGORY_BASE = '/api/v1/sales/itemMainCategory'
export const ITEM_GROUPED_BASE = '/api/v1/sales/item'
export const ITEM_SEQUENCE_BASE = '/api/v1/sales/itemSequence'
export const CATEGORY_TYPE_BASE = '/api/v1/sales/categoryType'
export const ITEM_TYPE_BASE = '/api/v1/sales/itemType'
export const ITEM_SUB_CATEGORY_ONE_BASE = '/api/v1/sales/itemSubCategoryOne'
export const ITEM_SUB_CATEGORY_TWO_BASE = '/api/v1/sales/itemSubCategoryTwo'
export const ITEM_SUB_CATEGORY_THREE_BASE = '/api/v1/sales/itemSubCategoryThree'
export const ITEM_MASTER_BASE = '/api/v1/sales/item/webItemMaster'

export type ItemPrice = {
  id: number
  userId: number | null
  subChannelId: number | null
  shortName: string | null
  rangeId: number | null
  itemId: number
  itemName: string | null
  sapCode: string | null
  itemPrice: number
  startDate: string
  validTill: string
  isActive: boolean
}

export type FindItemPriceResponse = ApiResponse<ItemPrice | null>
export type FindItemPriceByItemResponse = ApiResponse<ItemPrice[]>
export type FindItemPriceByTerritoryAndItemResponse = ApiResponse<ItemPrice[]>
export type ItemMainCategory = {
  userId: number | null
  catTypeId: number
  categoryType: string
  mainCatSeq: number
  itemMainCat: string
  isActive: boolean
  id: number
}
export type ItemMainCategoryResponse = ApiResponse<ItemMainCategory[]>
export type AddItemMainCategoryPayload = {
  userId: number
  catTypeId: number
  itemMainCat: string
  isActive: boolean
}
export type AddItemMainCategoryResponse = ApiResponse<ItemMainCategory>
export type UpdateItemMainCategoryPayload = {
  id: number
  userId: number
  catTypeId: number
  itemMainCat: string
  mainCatSeq: number
  isActive: boolean
}
export type UpdateItemMainCategoryResponse = ApiResponse<ItemMainCategory>
export type ChangeItemMainCategoryStatusResponse = ApiResponse<ItemMainCategory>
export type FindItemMainCategoryByIdResponse = ApiResponse<ItemMainCategory>

export type SubCategoryOne = {
  id: number
  userId: number | null
  mainCatId: number
  subCatOneName: string
  isActive: boolean
}
export type CreateSubCategoryPayload = {
  userId: number
  mainCatId: number
  subCatOneName: string
  isActive: boolean
}
export type CreateSubCategoryResponse = ApiResponse<SubCategoryOne>
export type UpdateSubCategoryPayload = {
  id: number
  userId: number
  mainCatId: number
  subCatSeq: number
  subCatOneName: string
  isActive: boolean
}
export type UpdateSubCategoryResponse = ApiResponse<SubCategoryOne>
export type ChangeSubCategoryStatusResponse = ApiResponse<SubCategoryOne>

export type SubCategoryTwo = {
  id: number
  userId: number | null
  catTypeId: number
  categoryType: string
  mainCatId: number
  mainCatName: string
  subOneId: number
  subCatOneName: string
  subSeq: number
  subCatTwoName: string
  isActive: boolean
}
export type AddSubSubCategoryPayload = {
  userId: number
  subOneId: number
  subCatTwoName: string
  isActive: boolean
}
export type AddSubSubCategoryResponse = ApiResponse<SubCategoryTwo>
export type UpdateSubSubCategoryPayload = {
  id: number
  userId: number
  subOneId: number
  subSeq: number
  subCatTwoName: string
  isActive: boolean
}
export type UpdateSubSubCategoryResponse = ApiResponse<SubCategoryTwo>
export type ChangeSubSubCategoryStatusResponse = ApiResponse<SubCategoryTwo>
export type GetAllSubSubCategoryResponse = ApiResponse<SubCategoryTwo[]>

export type SubCategoryThree = {
  id: number
  userId: number | null
  subCatThreeName: string
  isActive: boolean
}
export type GetAllFlavourResponse = ApiResponse<SubCategoryThree[]>
export type AddFlavourPayload = {
  userId: number
  subCatThreeName: string
  isActive: boolean
}
export type AddFlavourResponse = ApiResponse<SubCategoryThree>
export type UpdateFlavourPayload = {
  id: number
  userId: number
  subCatThreeName: string
  isActive: boolean
}
export type UpdateFlavourResponse = ApiResponse<SubCategoryThree>
export type ChangeFlavourStatusResponse = ApiResponse<SubCategoryThree>

export type GroupedItemByMainCategory = {
  mainCatId: number
  mainCatName: string
  itemId: number
  itemName: string
  itemPriceList: unknown
  active: boolean
}
export type GroupedItemsByMainCategoryResponse = ApiResponse<
  GroupedItemByMainCategory[]
>

export type ItemSequence = {
  userId: number | null
  id: number
  channelId: number
  channelName: string
  subChannelId: number
  subChannelName: string
  itemId: number
  itemName: string
  itemSequence: number
  isActive: boolean
  shortName: string
}
export type ItemSequenceResponse = ApiResponse<ItemSequence[]>

export type CategoryType = {
  id: number
  userId: number | null
  categoryType: string
  isActive: boolean
  catTypeSeq: number
}
export type CategoryTypeResponse = ApiResponse<CategoryType[]>
export type AddCategoryTypePayload = {
  userId: number
  categoryType: string
  isActive: boolean
}
export type AddCategoryTypeResponse = ApiResponse<CategoryType>
export type UpdateCategoryTypePayload = {
  id: number
  userId: number
  categoryType: string
  catTypeSeq: number
  isActive: boolean
}
export type UpdateCategoryTypeResponse = ApiResponse<CategoryType>
export type ChangeCategoryTypeStatusResponse = ApiResponse<CategoryType>
export type FindCategoryTypeByIdResponse = ApiResponse<CategoryType>
export type ItemBrand = {
  id: number
  userId: number | null
  itemTypeName: string | null
  itemType?: string | null
  isActive: boolean
}
export type GetItemBrandsResponse = ApiResponse<ItemBrand[]>

export type ItemMaster = {
  imagePath: string | null
  itemId: number
  itemName: string | null
  sapCode: string | null
  ln: number | null
  itemTypeId: number | null
  itemTypeName: string | null
  unitOfMeasure: string | null
  innerCount: number | null
  size: string | null
  measurement: string | null
  weight: number | null
  volume: number | null
  catTypeId: number | null
  categoryType: string | null
  catTypeSeq: number | null
  mainCatId: number | null
  mainCatName: string | null
  mainCatSeq: number | null
  subOneId: number | null
  subCatOneName: string | null
  subCatSeq: number | null
  subTwoCatId: number | null
  subCatTwoName: string | null
  subSeq: number | null
  subThreeCatId: number | null
  subCatThreeName: string | null
}

export type GetAllItemMasterResponse = ApiResponse<ItemMaster[]>
export type GetItemDetailsByIdResponse = ApiResponse<ItemMaster>
export type ChangeItemStatusResponse = ApiResponse<ItemMaster>
export type AddItemSequencePayload = {
  subChannelId: number
  itemId: number
  isActive: boolean
}
export type AddItemPricePayload = {
  itemId: number
  subChannelId: number
  itemPrice: number
  startDate: string
  validTill: string
  isActive: boolean
}
export type AddItemPayload = {
  userId: number
  itemTypeId: number
  subTwoCatId: number
  subThreeCatId: number
  itemName: string
  ln: number
  unitOfMeasure: string
  innerCount: number
  size: string
  volume: number
  weight: number
  measurement: string
  sapCode: string
  imagePath: string
  isActive: boolean
  itemSequenceDTOList: AddItemSequencePayload[]
  itemPriceDTOList: AddItemPricePayload[]
}
export type AddItemResponse = ApiResponse<ItemMaster>

export async function findItemPriceByItemId(
  itemId: Id
): Promise<FindItemPriceByItemResponse> {
  const res = await http.get<FindItemPriceByItemResponse>(
    `${ITEM_PRICE_BASE}/findByItemId/${itemId}`
  )
  return res.data
}

export async function getItemPricesByItemId(
  itemId: Id
): Promise<FindItemPriceByItemResponse> {
  return findItemPriceByItemId(itemId)
}

export async function getPriceListByItemId(
  itemId: Id
): Promise<FindItemPriceByItemResponse> {
  return findItemPriceByItemId(itemId)
}

export async function getPriceByTerritoryAndItemId(
  territoryId: Id,
  itemId: Id
): Promise<FindItemPriceByTerritoryAndItemResponse> {
  const res = await http.get<FindItemPriceByTerritoryAndItemResponse>(
    `${ITEM_PRICE_BASE}/findItemPricesByTerritoryAndItemIds/${itemId}/${territoryId}`
  )
  return res.data
}

export async function getItemMainCategories(): Promise<ItemMainCategoryResponse> {
  const res = await http.get<ItemMainCategoryResponse>(ITEM_MAIN_CATEGORY_BASE)
  return res.data
}

export async function addItemMainCategory(
  payload: AddItemMainCategoryPayload
): Promise<AddItemMainCategoryResponse> {
  const res = await http.post<AddItemMainCategoryResponse>(
    ITEM_MAIN_CATEGORY_BASE,
    payload
  )
  return res.data
}

export async function editMainCategory(
  payload: UpdateItemMainCategoryPayload
): Promise<UpdateItemMainCategoryResponse> {
  const res = await http.put<UpdateItemMainCategoryResponse>(
    ITEM_MAIN_CATEGORY_BASE,
    payload
  )
  return res.data
}

export async function statusChangeMainCategory(
  id: number
): Promise<ChangeItemMainCategoryStatusResponse> {
  const res = await http.delete<ChangeItemMainCategoryStatusResponse>(
    `${ITEM_MAIN_CATEGORY_BASE}/deactivateItemMainCategory/${id}`
  )
  return res.data
}

export async function findMainCategoryById(
  id: number
): Promise<FindItemMainCategoryByIdResponse> {
  const res = await http.get<FindItemMainCategoryByIdResponse>(
    `${ITEM_MAIN_CATEGORY_BASE}/findById/${id}`
  )
  return res.data
}

export async function createSubCategory(
  payload: CreateSubCategoryPayload
): Promise<CreateSubCategoryResponse> {
  const res = await http.post<CreateSubCategoryResponse>(
    ITEM_SUB_CATEGORY_ONE_BASE,
    payload
  )
  return res.data
}

export async function editSubCategory(
  payload: UpdateSubCategoryPayload
): Promise<UpdateSubCategoryResponse> {
  const res = await http.put<UpdateSubCategoryResponse>(
    ITEM_SUB_CATEGORY_ONE_BASE,
    payload
  )
  return res.data
}

export async function changeStatusSubCategory(
  id: number
): Promise<ChangeSubCategoryStatusResponse> {
  const res = await http.delete<ChangeSubCategoryStatusResponse>(
    `${ITEM_SUB_CATEGORY_ONE_BASE}/deactivateItemSubCategoryOne/${id}`
  )
  return res.data
}

export async function getAllSubcategory(): Promise<
  ApiResponse<SubCategoryOne[]>
> {
  const res = await http.get<ApiResponse<SubCategoryOne[]>>(
    ITEM_SUB_CATEGORY_ONE_BASE
  )
  return res.data
}

export async function getSubcategoryByMaincat(
  mainCatId: number
): Promise<ApiResponse<SubCategoryOne[]>> {
  const res = await http.get<ApiResponse<SubCategoryOne[]>>(
    `${ITEM_SUB_CATEGORY_ONE_BASE}/getAllItemSubCatOnesByMainCatId/${mainCatId}`
  )
  return res.data
}

export async function addSubSubCategory(
  payload: AddSubSubCategoryPayload
): Promise<AddSubSubCategoryResponse> {
  const res = await http.post<AddSubSubCategoryResponse>(
    ITEM_SUB_CATEGORY_TWO_BASE,
    payload
  )
  return res.data
}

export async function editSubSubCategory(
  payload: UpdateSubSubCategoryPayload
): Promise<UpdateSubSubCategoryResponse> {
  const res = await http.put<UpdateSubSubCategoryResponse>(
    ITEM_SUB_CATEGORY_TWO_BASE,
    payload
  )
  return res.data
}

export async function statusChangeSubSubCategory(
  subSubCategoryId: number
): Promise<ChangeSubSubCategoryStatusResponse> {
  const res = await http.delete<ChangeSubSubCategoryStatusResponse>(
    `${ITEM_SUB_CATEGORY_TWO_BASE}/deactivateItemSubCategoryTwo/${subSubCategoryId}`
  )
  return res.data
}

export async function getAllSubSubCategory(): Promise<GetAllSubSubCategoryResponse> {
  const res = await http.get<GetAllSubSubCategoryResponse>(
    ITEM_SUB_CATEGORY_TWO_BASE
  )
  return res.data
}

export async function getSubSubCategorybySubCatId(
  subCatId: number
): Promise<GetAllSubSubCategoryResponse> {
  const res = await http.get<GetAllSubSubCategoryResponse>(
    `${ITEM_SUB_CATEGORY_TWO_BASE}/getAllItemSubCatTwosBySubCatOneId/${subCatId}`
  )
  return res.data
}

export async function getAllFlavour(): Promise<GetAllFlavourResponse> {
  const res = await http.get<GetAllFlavourResponse>(
    ITEM_SUB_CATEGORY_THREE_BASE
  )
  return res.data
}

export async function addFlavour(
  payload: AddFlavourPayload
): Promise<AddFlavourResponse> {
  const res = await http.post<AddFlavourResponse>(
    ITEM_SUB_CATEGORY_THREE_BASE,
    payload
  )
  return res.data
}

export async function editFlavour(
  payload: UpdateFlavourPayload
): Promise<UpdateFlavourResponse> {
  const res = await http.put<UpdateFlavourResponse>(
    ITEM_SUB_CATEGORY_THREE_BASE,
    payload
  )
  return res.data
}

export async function changeStatusFlavour(
  id: number
): Promise<ChangeFlavourStatusResponse> {
  const res = await http.delete<ChangeFlavourStatusResponse>(
    `${ITEM_SUB_CATEGORY_THREE_BASE}/deactivateItemSubCategoryThree/${id}`
  )
  return res.data
}

export async function getItemsGroupedByMainCategory(
  territoryId: Id
): Promise<GroupedItemsByMainCategoryResponse> {
  const res = await http.get<GroupedItemsByMainCategoryResponse>(
    `${ITEM_GROUPED_BASE}/grouped-by-main-category-list/${territoryId}`
  )
  return res.data
}

export async function getAllItemsSequence(): Promise<ItemSequenceResponse> {
  const res = await http.get<ItemSequenceResponse>(ITEM_SEQUENCE_BASE)
  return res.data
}

export async function getItemSequenceByItemId(
  itemId: Id
): Promise<ItemSequenceResponse> {
  const res = await http.get<ItemSequenceResponse>(
    `${ITEM_SEQUENCE_BASE}/findByItemId/${itemId}`
  )
  return res.data
}

export async function getAllCategoryType(): Promise<CategoryTypeResponse> {
  const res = await http.get<CategoryTypeResponse>(CATEGORY_TYPE_BASE)
  return res.data
}

export async function getItemBrands(): Promise<GetItemBrandsResponse> {
  const res = await http.get<GetItemBrandsResponse>(ITEM_TYPE_BASE)
  return res.data
}

export async function getAllItemMaster(): Promise<GetAllItemMasterResponse> {
  const res = await http.get<GetAllItemMasterResponse>(ITEM_MASTER_BASE)
  return res.data
}

export async function getItemDetailsById(
  itemId: Id
): Promise<GetItemDetailsByIdResponse> {
  const res = await http.get<GetItemDetailsByIdResponse>(
    `${ITEM_GROUPED_BASE}/findById/${itemId}`
  )
  return res.data
}

export async function addItem(payload: AddItemPayload): Promise<AddItemResponse> {
  const res = await http.post<AddItemResponse>(ITEM_GROUPED_BASE, payload)
  return res.data
}

export async function changeStatusItem(
  itemId: number
): Promise<ChangeItemStatusResponse> {
  const res = await http.delete<ChangeItemStatusResponse>(
    `${ITEM_GROUPED_BASE}/deactivateItem/${itemId}`
  )
  return res.data
}

export async function chageStatusItem(
  itemId: number
): Promise<ChangeItemStatusResponse> {
  return changeStatusItem(itemId)
}

export async function addCategoryType(
  payload: AddCategoryTypePayload
): Promise<AddCategoryTypeResponse> {
  const res = await http.post<AddCategoryTypeResponse>(
    CATEGORY_TYPE_BASE,
    payload
  )
  return res.data
}

export async function updateCategoryType(
  payload: UpdateCategoryTypePayload
): Promise<UpdateCategoryTypeResponse> {
  const res = await http.put<UpdateCategoryTypeResponse>(
    CATEGORY_TYPE_BASE,
    payload
  )
  return res.data
}

export async function changeStatusCategoryType(
  id: number
): Promise<ChangeCategoryTypeStatusResponse> {
  const res = await http.delete<ChangeCategoryTypeStatusResponse>(
    `${CATEGORY_TYPE_BASE}/deactivateCategoryType/${id}`
  )
  return res.data
}

export async function findCategoryTypeById(
  id: number
): Promise<FindCategoryTypeByIdResponse> {
  const res = await http.get<FindCategoryTypeByIdResponse>(
    `${CATEGORY_TYPE_BASE}/findById/${id}`
  )
  return res.data
}
