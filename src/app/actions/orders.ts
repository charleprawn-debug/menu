"use server";
import { revalidatePath } from "next/cache";
import { Prisma, type PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";
import { logActivity } from "@/lib/audit";
import { assertPlanFeature, assertPlanLimit } from "@/lib/services/subscription";
const value=(f:FormData,k:string)=>{const v=f.get(k);return typeof v==="string"?v:""};
const bool=(f:FormData,k:string)=>["on","true","1"].includes(value(f,k));
const fail=(x:string):never=>{throw new Error(x)};
const refresh=()=>{revalidatePath("/app/orders","layout");revalidatePath("/app/orders");revalidatePath("/app/tables","layout")};
async function tenant(p:string){const m=await requireRestaurant();if(!m.isOwner&&!m.permissions.has(p))fail("FORBIDDEN");await assertPlanFeature(m.restaurantId,"order_management");return m}
const status=z.enum(["NEW","ACCEPTED","PREPARING","READY","DELIVERED","COMPLETED","REJECTED","CANCELLED"]);
const transitions:Record<string,string[]>={NEW:["ACCEPTED","REJECTED","CANCELLED"],ACCEPTED:["PREPARING","REJECTED","CANCELLED"],PREPARING:["READY","CANCELLED"],READY:["DELIVERED","CANCELLED"],DELIVERED:["COMPLETED"],COMPLETED:[],REJECTED:[],CANCELLED:[]};
async function change(id:string,next:string,note:string,permission:string){
  const m=await tenant(permission);
  const parsed=status.safeParse(next);
  if(!parsed.success)fail("INVALID_STATUS");
  const order=await db.order!.findFirst({where:{id,restaurantId:m.restaurantId}});
  if(!order)fail("NOT_FOUND");
  if(!transitions[order!.status].includes(parsed.data!))fail("INVALID_TRANSITION");
  const now=new Date();
  const data:Prisma.OrderUpdateManyMutationInput={status:parsed.data!};
  if(parsed.data==="ACCEPTED")data.acceptedAt=now;
  if(parsed.data==="PREPARING")data.preparingAt=now;
  if(parsed.data==="READY")data.readyAt=now;
  if(parsed.data==="DELIVERED")data.deliveredAt=now;
  if(parsed.data==="COMPLETED")data.completedAt=now;
  if(parsed.data==="CANCELLED")data.cancelledAt=now;
  if(parsed.data==="REJECTED")data.cancelReason=note||"Rejected by restaurant";
  await db.$transaction(async tx=>{
    const changed=await tx.order!.updateMany({where:{id,restaurantId:m.restaurantId,status:order!.status},data});
    if(changed.count!==1)fail("ORDER_CHANGED");
    await tx.orderStatusHistory.create({data:{orderId:id,fromStatus:order!.status,toStatus:parsed.data!,note:note||null,changedById:m.auth.user.id}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  await logActivity({restaurantId:m.restaurantId,actorId:m.auth.user.id,action:`orders.status.${parsed.data!.toLowerCase()}`,entity:"Order",entityId:id,newValue:{status:parsed.data!,note}});
  refresh();
}
export async function updateOrderStatusAction(f:FormData){return change(value(f,"id"),value(f,"status"),value(f,"note"),"orders.change_status")}
export async function acceptOrderAction(f:FormData){return change(value(f,"id"),"ACCEPTED","","orders.accept")}
export async function rejectOrderAction(f:FormData){return change(value(f,"id"),"REJECTED",value(f,"reason"),"orders.reject")}
export async function cancelOrderAction(f:FormData){return change(value(f,"id"),"CANCELLED",value(f,"reason"),"orders.cancel")}
export async function addOrderNoteAction(f:FormData){const m=await tenant("orders.view");const id=value(f,"id"),body=value(f,"body").trim();if(!body)fail("EMPTY_NOTE");if(!(await db.order!.findFirst({where:{id,restaurantId:m.restaurantId}})))fail("NOT_FOUND");await db.orderNote.create({data:{orderId:id,body,isInternal:bool(f,"isInternal"),authorId:m.auth.user.id}});refresh()}
export async function transferOrderAction(f:FormData){const m=await tenant("orders.change_status");const id=value(f,"id"),tableId=value(f,"tableId");const order=await db.order!.findFirst({where:{id,restaurantId:m.restaurantId}});const table=await db.table!.findFirst({where:{id:tableId,restaurantId:m.restaurantId,isActive:true}});if(!order||!table)fail("NOT_FOUND");const session=await db.tableSession.findFirst({where:{tableId,restaurantId:m.restaurantId,status:"OPEN"}});await db.order!.update({where:{id},data:{tableId:table!.id,sessionId:session?.id??null}});await db.table!.update({where:{id:table!.id},data:{status:"OCCUPIED"}});refresh()}
export async function duplicateOrderAction(f:FormData){const m=await tenant("orders.create");await assertPlanLimit(m.restaurantId,"ordersPerMonth");const id=value(f,"id");const original=await db.order!.findFirst({where:{id,restaurantId:m.restaurantId},include:{items:{include:{modifiers:true}}}});if(!original)fail("NOT_FOUND");const latest=await db.order!.findFirst({where:{restaurantId:m.restaurantId},orderBy:{orderNumber:"desc"},select:{orderNumber:true}});const copy=await db.$transaction(async tx=>{const order=await tx.order!.create({data:{restaurantId:m.restaurantId,orderNumber:(latest?.orderNumber??0)+1,type:original!.type,status:"NEW",tableId:original!.tableId,sessionId:original!.sessionId,customerName:original!.customerName,customerPhone:original!.customerPhone,subtotal:original!.subtotal,tax:original!.tax,serviceFee:original!.serviceFee,deliveryFee:original!.deliveryFee,total:original!.total,currency:original!.currency,notes:original!.notes,source:"REORDER",createdById:m.auth.user.id,itemsCount:original!.itemsCount}});for(const item of original!.items)await tx.orderItem.create({data:{orderId:order!.id,productId:item.productId,nameSnapshot:item.nameSnapshot,imageSnapshot:item.imageSnapshot,unitPrice:item.unitPrice,quantity:item.quantity,modifiersTotal:item.modifiersTotal,lineTotal:item.lineTotal,taxRate:item.taxRate,notes:item.notes,modifiers:{create:item.modifiers.map(x=>({optionId:x.optionId,groupName:x.groupName,name:x.name,priceDelta:x.priceDelta}))}}});await tx.orderStatusHistory.create({data:{orderId:order!.id,toStatus:"NEW",changedById:m.auth.user.id,note:"Reordered"}});return order});refresh()}
export async function createManualOrderAction(f:FormData){
  const m=await tenant("orders.create");
  const parsed=z.object({
    type:z.enum(["DINE_IN","PICKUP","DELIVERY"]),
    tableId:z.string().optional(),
    customerName:z.string().trim().max(120).optional(),
    customerPhone:z.string().trim().max(40).optional(),
    notes:z.string().trim().max(2000).optional(),
    paymentMethod:z.enum(["CASH","CARD","ONLINE","WALLET","BANK_TRANSFER","PAY_AT_PICKUP","PAY_ON_DELIVERY","OTHER"]).optional(),
    discount:z.string().trim().regex(/^\d{1,9}(?:\.\d{1,2})?$/).default("0"),
    items:z.string().min(2).max(100000),
  }).safeParse({
    type:value(f,"type"),tableId:value(f,"tableId")||undefined,customerName:value(f,"customerName"),customerPhone:value(f,"customerPhone"),notes:value(f,"notes"),
    paymentMethod:value(f,"paymentMethod")||undefined,discount:value(f,"discount")||"0",items:value(f,"items"),
  });
  if(!parsed.success) fail("INVALID_ORDER");
  const data=parsed.data!;
  const submittedCoupon=value(f,"couponCode").trim();
  if((new Prisma.Decimal(data.discount).gt(0)||submittedCoupon!=="")&&!m.isOwner&&!m.permissions.has("orders.discount")) fail("FORBIDDEN");
  let rawItems:unknown;
  try{rawItems=JSON.parse(data.items)}catch{fail("INVALID_ITEMS")}
  const itemSchema=z.object({productId:z.string().min(1).max(100),quantity:z.number().int().min(1).max(99),notes:z.string().trim().max(1000).optional(),modifierIds:z.array(z.string().min(1).max(100)).max(100).default([]),extraIds:z.array(z.string().min(1).max(100)).max(100).default([])});
  const itemsParsed=z.array(itemSchema).min(1).max(100).safeParse(rawItems);
  if(!itemsParsed.success) fail("INVALID_ITEMS");
  const items=itemsParsed.data!;
  if(items.some(item=>new Set(item.modifierIds).size!==item.modifierIds.length||new Set(item.extraIds).size!==item.extraIds.length)) fail("INVALID_ITEMS");
  const productIds=[...new Set(items.map(item=>item.productId))];
  const products=await db.product.findMany({
    where:{restaurantId:m.restaurantId,id:{in:productIds},deletedAt:null,isVisible:true},
    include:{modifierGroups:{include:{group:{include:{options:{where:{isAvailable:true}}}}}},extras:{where:{extra:{isActive:true}},include:{extra:true}}},
  });
  if(products.length!==productIds.length) fail("PRODUCT_NOT_AVAILABLE");
  const byId=new Map(products.map(product=>[product.id,product]));
  let subtotal=new Prisma.Decimal(0);
  let tax=new Prisma.Decimal(0);
  const snapshots=items.map(item=>{
    const product=byId.get(item.productId);
    if(!product) fail("PRODUCT_NOT_AVAILABLE");
    const groups=product!.modifierGroups.map(link=>link.group);
    const optionMap=new Map(groups.flatMap(group=>group.options.map(option=>[option.id,{group,option}] as const)));
    const selected=[] as {groupName:string;name:string;optionId:string;priceDelta:Prisma.Decimal}[];
    for(const group of groups){
      const ids=item.modifierIds.filter(id=>optionMap.get(id)?.group.id===group.id);
      const minimum=group.isRequired?Math.max(1,group.minSelect):group.minSelect;
      const maximum=group.isMultiple?group.maxSelect:Math.min(1,group.maxSelect);
      if(ids.length<minimum||ids.length>maximum) fail("INVALID_MODIFIERS");
      for(const id of ids){
        const entry=optionMap.get(id);
        if(!entry) fail("INVALID_MODIFIERS");
        selected.push({groupName:group.nameAr,name:entry!.option.nameAr,optionId:id,priceDelta:new Prisma.Decimal(entry!.option.priceDelta)});
      }
    }
    if(item.modifierIds.some(id=>!optionMap.has(id))) fail("INVALID_MODIFIERS");
    const extraMap=new Map(product!.extras.map(link=>[link.extra.id,link.extra]));
    if(item.extraIds.some(id=>!extraMap.has(id))) fail("INVALID_EXTRAS");
    const selectedExtras=item.extraIds.map(id=>extraMap.get(id)!);
    const modifierTotal=selected.reduce((sum,entry)=>sum.plus(entry.priceDelta),new Prisma.Decimal(0)).plus(selectedExtras.reduce((sum,extra)=>sum.plus(extra.price),new Prisma.Decimal(0))).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP);
    const lineTotal=new Prisma.Decimal(product!.price).plus(modifierTotal).mul(item.quantity).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP);
    const lineTax=lineTotal.mul(product!.taxRate).div(100).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP);
    subtotal=subtotal.plus(lineTotal);
    tax=tax.plus(lineTax);
    const modifiers=[...selected,...selectedExtras.map(extra=>({optionId:extra.id,groupName:"Extra",name:extra.nameAr,priceDelta:new Prisma.Decimal(extra.price)}))];
    return {product:product!,item,modifierTotal,lineTotal,modifiers,lineTax};
  });
  const basketTotal=subtotal.plus(tax).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP);
  const manualDiscount=new Prisma.Decimal(data.discount);
  let discount=manualDiscount.gt(basketTotal)?basketTotal:manualDiscount;
  let couponId:string|null=null;
  const couponCode=submittedCoupon.toUpperCase();
  if(couponCode){
    const coupon=await db.coupon.findFirst({where:{restaurantId:m.restaurantId,code:couponCode,isActive:true}});
    const now=new Date();
    if(!coupon||coupon.startsAt&&coupon.startsAt>now||coupon.endsAt&&coupon.endsAt<now||coupon.maxUses!==null&&coupon.usedCount>=coupon.maxUses||coupon.minOrder!==null&&basketTotal.lt(coupon.minOrder)) fail("INVALID_COUPON");
    const raw=coupon!.type==="PERCENTAGE"?new Prisma.Decimal(subtotal).mul(coupon!.value).div(100).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP):new Prisma.Decimal(coupon!.value);
    discount=raw.gt(basketTotal)?basketTotal:raw;
    if(coupon!.maxDiscount!==null&&discount.gt(coupon!.maxDiscount)) discount=new Prisma.Decimal(coupon!.maxDiscount);
    couponId=coupon!.id;
  }
  const total=basketTotal.minus(discount).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP);
  if(total.gt("9999999999.99")) fail("ORDER_TOTAL_TOO_LARGE");
  const table=data.tableId?await db.table!.findFirst({where:{id:data.tableId,restaurantId:m.restaurantId,isActive:true}}):null;
  if(data.type==="DINE_IN"&&!table) fail("TABLE_REQUIRED");
  const session=table?await db.tableSession.findFirst({where:{tableId:table!.id,restaurantId:m.restaurantId,status:"OPEN"}}):null;
  const settings=await db.restaurant.findFirst({where:{id:m.restaurantId},select:{orderSettings:true}});
  const orderSettings=(settings?.orderSettings&&typeof settings.orderSettings==="object"&&!Array.isArray(settings.orderSettings)?settings.orderSettings as Record<string,unknown>:{});
  await applyOrderSettingsGuards(m.restaurantId,Number(subtotal),Number(total),orderSettings);
  await assertPlanLimit(m.restaurantId,"ordersPerMonth");
  const submitMode=value(f,"submitMode");
  if(submitMode!==""&&submitMode!=="draft"&&submitMode!=="send"&&submitMode!=="confirm") fail("INVALID_SUBMIT_MODE");
  const status=submitMode==="draft"?"NEW":submitMode==="send"?"PREPARING":orderSettings.autoAccept===true?"ACCEPTED":"NEW";
  const order=await db.$transaction(async tx=>{
    const latest=await tx.order!.findFirst({where:{restaurantId:m.restaurantId},orderBy:{orderNumber:"desc"},select:{orderNumber:true}});
    const created=await tx.order!.create({data:{restaurantId:m.restaurantId,orderNumber:(latest?.orderNumber??0)+1,type:data.type,status:status as "NEW"|"ACCEPTED"|"PREPARING",tableId:table?.id??null,sessionId:session?.id??null,customerName:data.customerName||null,customerPhone:data.customerPhone||null,subtotal,discount,tax,total,currency:m.restaurant.currency,notes:data.notes||null,paymentMethod:data.paymentMethod as PaymentMethod|undefined,paymentStatus:"UNPAID",source:submitMode==="draft"?"DRAFT":"MANUAL",couponId,couponCode:couponCode||null,createdById:m.auth.user.id,itemsCount:items.reduce((sum,item)=>sum+item.quantity,0)}});
    for(const snapshot of snapshots){
      await tx.orderItem.create({data:{orderId:created.id,productId:snapshot.product.id,nameSnapshot:snapshot.product.nameAr,imageSnapshot:snapshot.product.imageUrl,unitPrice:snapshot.product.price,quantity:snapshot.item.quantity,modifiersTotal:snapshot.modifierTotal,lineTotal:snapshot.lineTotal,taxRate:snapshot.product.taxRate,notes:snapshot.item.notes||null,modifiers:{create:snapshot.modifiers.map(modifier=>({optionId:modifier.optionId,groupName:modifier.groupName,name:modifier.name,priceDelta:modifier.priceDelta}))}}});
    }
    await tx.orderStatusHistory.create({data:{orderId:created.id,toStatus:created.status,changedById:m.auth.user.id}});
    if(couponId){
      const coupon=await tx.coupon.findFirst({where:{id:couponId,restaurantId:m.restaurantId,isActive:true}});
      if(!coupon||coupon.maxUses!==null&&coupon.usedCount>=coupon.maxUses) fail("COUPON_LIMIT_REACHED");
      await tx.coupon.update({where:{id:couponId},data:{usedCount:{increment:1}}});
      await tx.couponUsage.create({data:{couponId,orderId:created.id,amount:discount}});
    }
    if(table) await tx.table!.update({where:{id:table!.id},data:{status:"OCCUPIED"}});
    return created;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  await logActivity({restaurantId:m.restaurantId,actorId:m.auth.user.id,action:"orders.manual.created",entity:"Order",entityId:order.id,newValue:{orderNumber:order.orderNumber,total:total.toFixed(2),currency:m.restaurant.currency}});
  refresh();
}
export async function saveOrderSettingsAction(f:FormData){const m=await tenant("settings.manage");const settings={requireApproval:bool(f,"requireApproval"),autoAccept:bool(f,"autoAccept"),minOrder:Number(value(f,"minOrder"))||0,maxOrder:Number(value(f,"maxOrder"))||999999,acceptWhenClosed:bool(f,"acceptWhenClosed"),defaultPrepMinutes:Number(value(f,"defaultPrepMinutes"))||15,allowCustomerEdit:bool(f,"allowCustomerEdit"),allowCustomerCancel:bool(f,"allowCustomerCancel"),maxConcurrent:Number(value(f,"maxConcurrent"))||50,openTime:value(f,"openTime")||"00:00",closeTime:value(f,"closeTime")||"23:59"};if(settings.minOrder>settings.maxOrder)fail("INVALID_ORDER_LIMITS");await db.restaurant.update({where:{id:m.restaurantId},data:{orderSettings:settings}});refresh()}

export async function recordOrderPaymentAction(f:FormData){
  const m=await tenant("payments.record");
  const id=value(f,"orderId");
  const method=value(f,"method")||"CASH";
  if(method!=="CASH") fail("PAYMENT_PROVIDER_REQUIRED");
  let amount:Prisma.Decimal;
  try { amount=new Prisma.Decimal(value(f,"amount")); } catch { fail("INVALID_PAYMENT"); }
  if(!amount!.isFinite()||!amount!.gt(0)) fail("INVALID_PAYMENT");
  await db.$transaction(async(tx)=>{
    const order=await tx.order!.findFirst({where:{id,restaurantId:m.restaurantId},include:{payments:true,invoice:true}});
    if(!order) fail("NOT_FOUND");
    const paid=order!.payments.reduce((sum,p)=>sum.plus(p.amount),new Prisma.Decimal(0));
    const newPaid=paid.plus(amount!);
    if(newPaid.gt(order!.total)) fail("PAYMENT_EXCEEDS_TOTAL");
    const next=newPaid.gte(order!.total)?"PAID":"PARTIALLY_PAID";
    await tx.payment.create({data:{restaurantId:m.restaurantId,orderId:id,amount:amount!,currency:order!.currency,method:"CASH",status:"PAID",receivedById:m.auth.user.id}});
    await tx.order!.update({where:{id},data:{paymentStatus:next}});
    if(order!.invoice){
      await tx.invoice.update({where:{id:order!.invoice.id},data:{paidAmount:newPaid,status:newPaid.gte(order!.invoice.total)?"PAID":"PARTIALLY_PAID"}});
    }
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  refresh();
}
export async function issueOrderInvoiceAction(f:FormData){
  const m=await tenant("invoices.create");
  const id=value(f,"orderId");
  const order=await db.order!.findFirst({where:{id,restaurantId:m.restaurantId},include:{items:true,invoice:true,payments:true}});
  if(!order) fail("NOT_FOUND");
  if(order!.invoice){refresh();return;}
  const paid=order!.payments.reduce((sum,p)=>sum.plus(p.amount),new Prisma.Decimal(0));
  const status=paid.gte(order!.total)?"PAID":paid.gt(0)?"PARTIALLY_PAID":"ISSUED";
  const invoiceNumber=`INV-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${id.slice(-8)}`;
  await db.invoice.create({data:{restaurantId:m.restaurantId,orderId:id,invoiceNumber,subtotal:order!.subtotal,discount:order!.discount,tax:order!.tax,serviceFee:order!.serviceFee,total:order!.total,paidAmount:paid,currency:order!.currency,status,items:{create:order!.items.map(i=>({name:i.nameSnapshot,quantity:i.quantity,unitPrice:i.unitPrice,total:i.lineTotal}))}}});
  refresh();
}
export async function applyOrderSettingsGuards(restaurantId:string,subtotal:number,total:number,settings:Record<string,unknown>){const min=Number(settings.minOrder??0),max=Number(settings.maxOrder??Number.MAX_SAFE_INTEGER);if(total<min||total>max)fail("ORDER_OUTSIDE_LIMITS");const current=await db.order!.count({where:{restaurantId,status:{in:["NEW","ACCEPTED","PREPARING","READY"]}}});if(current>=Number(settings.maxConcurrent??Number.MAX_SAFE_INTEGER))fail("ORDER_CAPACITY_REACHED");const now=new Date();const mins=now.getHours()*60+now.getMinutes();const parse=(x:unknown,d:number)=>{const [h,m]=String(x??"").split(":").map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:d};const open=parse(settings.openTime,0),close=parse(settings.closeTime,1439);const closed=open<=close?(mins<open||mins>close):(mins<open&&mins>close);if(closed&&!settings.acceptWhenClosed)fail("ORDERS_CLOSED")}
