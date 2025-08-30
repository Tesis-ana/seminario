import { useLocalSearchParams, router } from 'expo-router'
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import { useState } from 'react'
import { getMyProfessional, registerAttention } from '@/lib/api'
import { AppHeader, Card, layoutStyles } from '@/components/ui'

export default function NewConsultation() {
  const { id } = useLocalSearchParams()
  const [notes, setNotes] = useState('')

  const handleSave = async () => {
    try {
      const prof = await getMyProfessional()
      await registerAttention(Number(id), prof.id, notes)
      Alert.alert('Consulta registrada')
      router.back()
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'No se pudo registrar la consulta')
    }
  }

  return (
    <View style={layoutStyles.container}>
      <AppHeader title="WoundNetB7 AI" subtitle="Registrar Consulta" />
      <View style={layoutStyles.body}>
        <Card>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Nueva consulta</Text>
          <TextInput style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding:8, minHeight:120, textAlignVertical:'top', marginBottom:12 }} placeholder="Notas de la consulta" value={notes} onChangeText={setNotes} multiline />
          <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:12, borderRadius:8, alignItems:'center' }} onPress={handleSave}>
            <Text style={{ color:'#fff', fontWeight:'600' }}>Guardar</Text>
          </TouchableOpacity>
        </Card>
      </View>
    </View>
  )
}