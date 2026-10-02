import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AssetItem } from '@/features/assets/application/asset-gateway';
import type { AssetType } from '@/features/assets/domain/asset';
import { ChoiceChips } from '@/shared/components/ChoiceChips'; import { FormField } from '@/shared/components/FormField'; import { PrimaryButton } from '@/shared/components/PrimaryButton'; import { getErrorMessage } from '@/shared/lib/errors'; import { colors } from '@/shared/theme/colors';
export type AssetFormValue = { name: string; type: AssetType; balance: string; currency: string };
export function AssetForm({ initial, saving=false, onSubmit }: { initial?: AssetItem; saving?: boolean; onSubmit:(value:AssetFormValue)=>Promise<void> }) {
  const [name,setName]=useState(initial?.name??''); const [type,setType]=useState<AssetType>(initial?.type??'checking'); const [balance,setBalance]=useState(initial?.balance??''); const [currency,setCurrency]=useState(initial?.currency??'TRY'); const [error,setError]=useState<string|null>(null);
  async function submit(){setError(null);try{await onSubmit({name,type,balance,currency});}catch(e){setError(getErrorMessage(e));}}
  return <View style={s.box}><FormField label="Varlık adı" value={name} onChangeText={setName} placeholder="Garanti Mevduat"/><Text style={s.label}>Tür</Text><ChoiceChips choices={[{value:'cash',label:'Nakit'},{value:'checking',label:'Banka'},{value:'savings',label:'Birikim'}]} value={type} onChange={setType}/><FormField label="Mevcut bakiye" value={balance} onChangeText={setBalance} keyboardType="decimal-pad" placeholder="0,00"/><Text style={s.label}>Para birimi</Text><ChoiceChips choices={['TRY','USD','EUR','GBP'].map(value=>({value,label:value}))} value={currency} onChange={setCurrency}/>{error&&<Text style={s.error}>{error}</Text>}<PrimaryButton label={initial?'Varlığı güncelle':'Varlığı ekle'} loading={saving} onPress={()=>void submit()}/></View>;
}
const s=StyleSheet.create({box:{gap:14,padding:18,borderWidth:1,borderColor:colors.border,borderRadius:20,backgroundColor:colors.surface},label:{color:colors.text,fontWeight:'700'},error:{color:colors.danger}});
