import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {Empty, Field, Page} from '../../components/Ui';
import {companies} from '../company/registry';
import {isUuid} from '../../utils/validation';

export function EmployerWorkspace({applications = false}: { applications?: boolean }) {
    const list = companies();
    const [id, setId] = useState('');
    const navigate = useNavigate();
    return <Page title={applications ? 'Hồ sơ ứng tuyển' : 'Tin tuyển dụng'} eyebrow="Nhà tuyển dụng"
                 description={applications ? 'Chọn công ty, sau đó chọn tin để xem hồ sơ ứng tuyển.' : 'Chọn công ty để quản lý hoặc đăng tin tuyển dụng.'}>
        {list.length ? <div className="cards">{list.map(company => <article className="panel" key={company.id}>
            <h2>{company.name}</h2><Link className="button"
                                         to={'/employer/companies/' + company.id + '/jobs' + (applications ? '?view=applications' : '')}>{applications ? 'Chọn tin để xem hồ sơ' : 'Quản lý tin tuyển dụng'}</Link>{!applications &&
            <Link className="button button-secondary" to={'/employer/jobs/new?companyId=' + company.id}>Đăng tin tuyển
                dụng</Link>}</article>)}</div> : <Empty title="Chưa kết nối công ty"
                                                        text="Tạo hồ sơ công ty hoặc sử dụng mã công ty bạn đã được mời tham gia."
                                                        action={<Link className="button" to="/employer/companies">Tạo hồ
                                                            sơ công ty</Link>}/>}
        <details className="panel">
            <summary>Mở công ty sẵn có</summary>
            <p>Dùng mã hoặc đường dẫn do chủ sở hữu cung cấp. Quyền truy cập sẽ được kiểm tra khi mở danh sách tin.</p>
            <form onSubmit={event => {
                event.preventDefault();
                if (isUuid(id)) navigate('/employer/companies/' + id + '/jobs' + (applications ? '?view=applications' : ''));
            }}><Field label="Mã công ty"
                      error={id && !isUuid(id) ? 'Mã chưa hợp lệ. Hãy kiểm tra lại mã được cung cấp.' : undefined}><input
                value={id} onChange={event => setId(event.target.value.trim())}/></Field>
                <button disabled={!isUuid(id)} className="button">Mở tin tuyển dụng</button>
            </form>
        </details>
    </Page>;
}
