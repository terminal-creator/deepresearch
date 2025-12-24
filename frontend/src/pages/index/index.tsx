import IconBg from '@/assets/index/bg.png'
import IconSearch from '@/assets/index/search.svg'
import { Input } from 'antd'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import styles from './index.module.scss'

export default function Index() {
  const cardList = useMemo(
    () => [
      {
        title: '安责行业助手',
        icon: IconSearch,
        desc: '安责行业助手安,责行业助手',
        color: '#543D21',
        bgColor: '#F6F1EB',
      },
      {
        title: '餐饮行业助手',
        icon: IconSearch,
        desc: '安责行业助手安,责行业助手',
        color: '#335519',
        bgColor: '#EDF7E6',
      },
      {
        title: '交通运输行业助手',
        icon: IconSearch,
        desc: '安责行业助手安,责行业助手',
        color: '#055588',
        bgColor: '#E7F4FF',
      },
      {
        title: '初创企业助手',
        icon: IconSearch,
        desc: '安责行业助手安,责行业助手',
        color: '#1144BA',
        bgColor: '#EFF3FF',
      },
    ],
    [],
  )

  return (
    <div className={styles['index-page']}>
      <div className={styles.header}>
        <img className={styles.bg} src={IconBg} />
        <div className={styles.title}>Hi～欢迎来到行业咨询助手</div>
        <div className={styles.desc}>
          大模型驱动的行业资讯助手，为不同类型用户提供更便捷的AI应用开发平台
        </div>
      </div>

      <div className={styles['search-bar']}>
        <div className={styles['switch']}>
          <div>我的</div>
          <div className={styles.active}>市场</div>
        </div>

        <div className={styles['search-bar__input']}>
          <Input
            prefix={<img src={IconSearch} />}
            placeholder="搜索应用"
            size="large"
            readOnly
          />
        </div>
      </div>

      <div className={styles['card-list']}>
        {cardList.map((item) => (
          <Link
            className={styles['card-item']}
            key={item.title}
            style={{
              backgroundColor: item.bgColor,
              color: item.color,
            }}
            to={`/chat?title=${item.title}`}
          >
            <div
              className={styles['card-item__icon']}
              style={{
                borderColor: item.color,
              }}
            >
              <img src={item.icon} />
            </div>

            <div className={styles['card-item__title']}>{item.title}</div>
            <div className={styles['card-item__desc']}>{item.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
