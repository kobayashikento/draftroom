'use client';
import {
  Button as ChakraButton, Field as ChakraField, Input as ChakraInput,
  Textarea as ChakraTextarea, NativeSelect, Checkbox, Badge,
} from '@chakra-ui/react';

export function Button({children, className='', ...props}) {
  const primary = className.split(' ').includes('primary');
  return <ChakraButton type="button" colorPalette="pistachio" variant={primary?'solid':'outline'} size="sm" height="auto" minWidth="0" whiteSpace="normal" fontWeight="550" className={className} {...props}>{children}</ChakraButton>;
}
export function Field({label, wide=false, children}) {
  return <ChakraField.Root className={`field ${wide?'wide':''}`}>
    <ChakraField.Label fontSize="11px" fontWeight="500" color="draftroom.muted">{label}</ChakraField.Label>
    {children}
  </ChakraField.Root>;
}
export function Input({type, checked, onChange, ...props}) {
  if (type==='checkbox') return <Checkbox.Root colorPalette="pistachio" size="sm" checked={checked} onCheckedChange={({checked})=>onChange?.({target:{checked:checked===true}})} flexShrink="0">
    <Checkbox.HiddenInput {...props}/>
    <Checkbox.Control><Checkbox.Indicator/></Checkbox.Control>
  </Checkbox.Root>;
  return <ChakraInput type={type} colorPalette="pistachio" size="sm" bg="draftroom.raised" borderColor="draftroom.controlBorder" borderRadius="8px" color="draftroom.ink" fontSize="12px" height="auto" minHeight="38px" {...props} onChange={onChange}/>;
}
export function Textarea(props) {
  return <ChakraTextarea colorPalette="pistachio" size="sm" bg="draftroom.raised" borderColor="draftroom.controlBorder" borderRadius="8px" color="draftroom.ink" fontSize="12px" {...props}/>;
}
export function Select({options,value,onChange,style,...props}) {
  return <NativeSelect.Root className="studio-select" colorPalette="pistachio" size="sm" width="auto" minWidth="0" style={style}>
    <NativeSelect.Field value={value} onChange={e=>onChange(e.target.value)} bg="draftroom.raised" borderColor="draftroom.controlBorder" borderRadius="8px" color="draftroom.ink" fontSize="12px" paddingEnd="30px" height="auto" minHeight="38px" {...props}>
      {options.map(x=>{const [v,n]=typeof x==='string'?[x,x]:x;return <option key={v} value={v}>{n}</option>})}
    </NativeSelect.Field><NativeSelect.Indicator/>
  </NativeSelect.Root>;
}
export { Badge };
